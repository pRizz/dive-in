import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GITHUB_ISSUES_URL } from '../constants';
import { buildPromptText } from './build-prompt-text';
import { buildSkillText } from './build-skill-text';
import { promptCards } from './load-prompt-cards';
import PromptsTab from './prompts-tab';
import { INSTALL_ALL_SKILLS_COMMAND } from './skills-install-command';

const { createSkillBundleZipMock, downloadBlobFileMock } = vi.hoisted(() => ({
  createSkillBundleZipMock: vi.fn(),
  downloadBlobFileMock: vi.fn(),
}));

vi.mock('./export-skill-bundle', () => ({
  createSkillBundleZip: createSkillBundleZipMock,
}));

vi.mock('./download-file', () => ({
  downloadBlobFile: downloadBlobFileMock,
}));

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

    createSkillBundleZipMock.mockReset();
    createSkillBundleZipMock.mockResolvedValue({
      blob: new Blob(['skills'], { type: 'application/zip' }),
      filename: 'deep-dive-skills-both.zip',
      manifest: {
        generatedAt: '2026-02-10T00:00:00.000Z',
        source: 'Deep Dive Prompts Tab',
        selectedFormat: 'both',
        totalSkills: promptCards.length,
        skills: [],
      },
    });

    downloadBlobFileMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders header, onboarding CTA, and all prompt cards', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    await waitFor(() => normalizeText(container).includes('dockerfile ai prompts'));
    const pageText = normalizeText(container);
    promptCards.forEach((card) => {
      expect(pageText).toContain(card.title.toLowerCase());
    });

    expect(pageText).toContain('skills are reusable instruction playbooks');
    expect(pageText).toContain(INSTALL_ALL_SKILLS_COMMAND.toLowerCase());
    expect(pageText).toContain(
      'after install, in codex type /, select the appropriate deep-dive-* skill, then submit your request.',
    );
    const issuesLinks = Array.from(container.querySelectorAll('a[href]')).filter(
      (link) => (link as HTMLAnchorElement).getAttribute('href') === GITHUB_ISSUES_URL,
    );
    expect(issuesLinks.length).toBeGreaterThan(0);
    expect(findButtons(container, 'copy install command').length).toBe(1);
    expect(findButtons(container, 'copy prompt').length).toBe(promptCards.length);
    expect(findButtons(container, 'copy skill').length).toBe(promptCards.length);
  });

  it('shows macOS-specific Docker Desktop link tip', async () => {
    await act(async () => {
      root.render(<PromptsTab hostPlatform="darwin" />);
    });

    await waitFor(() => normalizeText(container).includes('⌘ command-click'));
    expect(normalizeText(container)).toContain(
      'prompts & skills docs (⌘ command-click to open links).',
    );
    expect(normalizeText(container)).toContain(
      'tip (docker desktop): use ⌘ command-click to open links in your browser.',
    );
  });

  it('shows windows/linux-specific Docker Desktop link tip', async () => {
    await act(async () => {
      root.render(<PromptsTab hostPlatform="win32" />);
    });

    await waitFor(() => normalizeText(container).includes('⌃ control-click'));
    expect(normalizeText(container)).toContain(
      'prompts & skills docs (⌃ control-click to open links).',
    );
    expect(normalizeText(container)).toContain(
      'tip (docker desktop): use ⌃ control-click to open links in your browser.',
    );
  });

  it('shows fallback Docker Desktop link tip when platform is unknown', async () => {
    await act(async () => {
      root.render(<PromptsTab hostPlatform={undefined} />);
    });

    await waitFor(() => normalizeText(container).includes('⌘/⌃ command/control-click'));
    expect(normalizeText(container)).toContain(
      'prompts & skills docs (⌘/⌃ command/control-click to open links).',
    );
    expect(normalizeText(container)).toContain(
      'tip (docker desktop): use ⌘/⌃ command/control-click to open links in your browser.',
    );
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

    const copyPromptButton = await waitForButton(container, 'copy prompt', 0);
    await clickButton(copyPromptButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(buildPromptText(promptCards[0]));
  });

  it('copies codex skill text from card copy skill button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const copySkillButton = await waitForButton(container, 'copy skill', 0);
    await clickButton(copySkillButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(buildSkillText(promptCards[0]).codexSkillMarkdown);
  });

  it('copies install command from onboarding copy button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const copyInstallCommandButton = await waitForButton(container, 'copy install command', 0);
    await clickButton(copyInstallCommandButton);

    await waitFor(() => writeTextMock.mock.calls.length > 0);
    expect(writeTextMock).toHaveBeenCalledWith(INSTALL_ALL_SKILLS_COMMAND);
  });

  it('copies prompt text from modal copy prompt button', async () => {
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

  it('opens export dialog and triggers bundle export', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    const openExportDialogButton = await waitForButton(container, 'export all skills', 0);
    await clickButton(openExportDialogButton);

    await waitFor(() => normalizeText(document.body).includes('choose which skill formats'));
    const exportDialogText = normalizeText(document.body);
    expect(exportDialogText).toContain('~/.agents/skills');
    expect(exportDialogText).toContain('.codex/skills');
    expect(exportDialogText).toContain('system/developer/custom-instructions');
    const exportSkillsButton = await waitForButton(document.body, 'export skills', 0);
    await clickButton(exportSkillsButton);

    await waitFor(() => createSkillBundleZipMock.mock.calls.length > 0);
    expect(createSkillBundleZipMock).toHaveBeenCalledWith(promptCards, 'both');
    expect(downloadBlobFileMock).toHaveBeenCalledTimes(1);
  });

  it('shows copied prompt feedback then resets on card copy button', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    vi.useFakeTimers();

    const copyButton = await waitForButton(container, 'copy prompt', 0);
    await clickButton(copyButton);

    await act(async () => {
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied prompt').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      vi.advanceTimersByTime(1799);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied prompt').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied prompt').length).toBe(0);
  });

  it('shows copied install command feedback then resets', async () => {
    await act(async () => {
      root.render(<PromptsTab />);
    });

    vi.useFakeTimers();

    const copyInstallCommandButton = await waitForButton(container, 'copy install command', 0);
    await clickButton(copyInstallCommandButton);

    await act(async () => {
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied install command').length).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1799);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied install command').length).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(findButtons(container, 'copied install command').length).toBe(0);
    expect(findButtons(container, 'copy install command').length).toBe(1);
  });
});
