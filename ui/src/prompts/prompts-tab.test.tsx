import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPromptText } from './build-prompt-text';
import { promptCards } from './load-prompt-cards';
import PromptsTab from './prompts-tab';

function normalizeText(node: ParentNode) {
  return node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function findButtons(root: ParentNode, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return Array.from(root.querySelectorAll('button')).filter(
    (button): button is HTMLButtonElement => normalizeText(button) === normalizedLabel,
  );
}

async function waitFor(condition: () => boolean, timeoutMs = 3000) {
  const stepMs = 20;
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / stepMs));
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (condition()) {
      return;
    }
    await act(async () => {
      await Promise.resolve();
    });
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error('Timed out waiting for condition.');
}

async function waitForButton(root: ParentNode, label: string, index = 0) {
  await waitFor(() => findButtons(root, label).length > index);
  return findButtons(root, label)[index];
}

async function clickButton(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
  });
}

describe('PromptsTab', () => {
  let container: HTMLDivElement;
  let root: Root;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    writeTextMock = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders header and all prompt cards', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    await waitFor(() => normalizeText(container).includes('dockerfile ai prompts'));
    const pageText = normalizeText(container);
    promptCards.forEach((card) => {
      expect(pageText).toContain(card.title.toLowerCase());
    });
    expect(findButtons(container, 'copy').length).toBe(promptCards.length);
  });

  it('opens prompt details modal when a card is clicked', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const firstCard = promptCards[0];
    const openButton = container.querySelector(
      `button[aria-label=\"Open prompt details for ${firstCard.title}\"]`,
    ) as HTMLButtonElement | null;

    expect(openButton).toBeTruthy();
    await clickButton(openButton as HTMLButtonElement);

    await waitFor(() => normalizeText(document.body).includes('copy-ready prompt'));
    expect(normalizeText(document.body)).toContain(firstCard.title.toLowerCase());
  });

  it('copies prompt text from card copy button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const copyButton = await waitForButton(container, 'copy', 0);
    await clickButton(copyButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(buildPromptText(promptCards[0]));
  });

  it('copies prompt text from modal copy button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const firstCard = promptCards[0];
    const openButton = container.querySelector(
      `button[aria-label=\"Open prompt details for ${firstCard.title}\"]`,
    ) as HTMLButtonElement | null;
    await clickButton(openButton as HTMLButtonElement);

    const copyPromptButton = await waitForButton(document.body, 'copy prompt', 0);
    await clickButton(copyPromptButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(buildPromptText(firstCard));
  });

  it('shows copied feedback then resets on card copy button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    vi.useFakeTimers();

    const copyButton = await waitForButton(container, 'copy', 0);
    await clickButton(copyButton);

    await act(async () => {
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      vi.advanceTimersByTime(1799);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied').length).toBe(0);
  });
});
