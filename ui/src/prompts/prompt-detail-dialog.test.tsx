import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPromptText } from './build-prompt-text';
import { buildSkillText } from './build-skill-text';
import { promptCards } from './load-prompt-cards';
import PromptDetailDialog from './prompt-detail-dialog';

function normalizeText(node: ParentNode) {
  return node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function findButtons(root: ParentNode, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return Array.from(root.querySelectorAll('button')).filter(
    (button): button is HTMLButtonElement => normalizeText(button) === normalizedLabel,
  );
}

function findInputByLabel(root: ParentNode, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const labels = Array.from(root.querySelectorAll('label'));
  const matching = labels.find((node) => normalizeText(node) === normalizedLabel);
  if (!matching) {
    return undefined;
  }
  const inputId = matching.getAttribute('for');
  if (!inputId) {
    return undefined;
  }
  return root.querySelector(`[id=\"${inputId}\"]`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | undefined;
}

function findRadioByLabel(root: ParentNode, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const labels = Array.from(root.querySelectorAll('label'));
  const matching = labels.find((node) => normalizeText(node).includes(normalizedLabel));
  if (!matching) {
    return undefined;
  }
  const nested = matching.querySelector('input[type="radio"]');
  if (nested instanceof HTMLInputElement) {
    return nested;
  }
  const inputId = matching.getAttribute('for');
  if (!inputId) {
    return undefined;
  }
  return root.querySelector(`[id=\"${inputId}\"]`) as HTMLInputElement | undefined;
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

describe('PromptDetailDialog', () => {
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
    vi.restoreAllMocks();
  });

  it('switches skill format and updates skill preview', async () => {
    const card = promptCards[0];

    await act(async () => {
      root.render(<PromptDetailDialog open card={card} onClose={() => {}} />);
    });

    await waitFor(() => normalizeText(document.body).includes('copy-ready skill (codex skill.md)'));
    const codexSkillField = findInputByLabel(document.body, 'Copy-ready skill (Codex SKILL.md)');
    expect(codexSkillField).toBeDefined();
    expect(codexSkillField?.value).toContain('## Purpose');

    const genericRadio = findRadioByLabel(document.body, 'generic');
    expect(genericRadio).toBeDefined();
    await act(async () => {
      (genericRadio as HTMLInputElement).click();
    });

    await waitFor(() =>
      normalizeText(document.body).includes('copy-ready skill (generic markdown)'),
    );
    const genericSkillField = findInputByLabel(
      document.body,
      'Copy-ready skill (Generic markdown)',
    );
    expect(genericSkillField).toBeDefined();
    expect(genericSkillField?.value).toContain('## Context');
  });

  it('copies prompt and selected skill format content', async () => {
    const card = promptCards[0];

    await act(async () => {
      root.render(<PromptDetailDialog open card={card} onClose={() => {}} />);
    });

    const copyPromptButton = await waitForButton(document.body, 'copy prompt');
    await clickButton(copyPromptButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(buildPromptText(card));

    const genericRadio = findRadioByLabel(document.body, 'generic');
    await act(async () => {
      (genericRadio as HTMLInputElement).click();
    });

    const copySkillButton = await waitForButton(document.body, 'copy skill');
    await clickButton(copySkillButton);

    await waitFor(() => writeTextMock.mock.calls.length >= 2);
    expect(writeTextMock).toHaveBeenLastCalledWith(buildSkillText(card).genericSkillMarkdown);
  });
});
