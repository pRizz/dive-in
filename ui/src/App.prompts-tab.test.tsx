import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { createDockerDesktopClientMock } = vi.hoisted(() => ({
  createDockerDesktopClientMock: vi.fn(),
}));

vi.mock(
  '@docker/extension-api-client/dist/index.js',
  () => ({
    createDockerDesktopClient: createDockerDesktopClientMock,
  }),
  { virtual: true },
);

function normalizeText(node: Element) {
  return node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function findButtons(container: HTMLElement, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return Array.from(container.querySelectorAll('button')).filter(
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

async function waitForButton(container: HTMLElement, label: string) {
  await waitFor(() => findButtons(container, label).length > 0);
  return findButtons(container, label)[0];
}

async function clickButton(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
  });
}

describe('App prompts tab', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    createDockerDesktopClientMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders three top-level tabs and switches tabpanels correctly', async () => {
    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/app:latest'],
            Id: 'sha256:image-1',
            RepoDigests: [],
            Created: 1700000000,
            Size: 1000,
          },
        ]),
      },
      extension: {
        vm: {
          service: {
            get: vi.fn(async (path: string) => {
              if (path === '/checkdive') {
                return {};
              }
              if (path === '/history') {
                return [];
              }
              throw new Error(`Unhandled GET ${path}`);
            }),
            post: vi.fn(),
            delete: vi.fn(),
          },
        },
      },
      host: {
        openExternal: vi.fn(),
      },
    } as never);

    await act(async () => {
      root.render(<App />);
    });

    const analysisTab = await waitForButton(container, 'analysis');
    const historyTab = await waitForButton(container, 'history');
    const promptsTab = await waitForButton(container, 'prompts');

    expect(analysisTab).toBeTruthy();
    expect(historyTab).toBeTruthy();
    expect(promptsTab).toBeTruthy();

    await waitFor(() => container.querySelectorAll('[role="tabpanel"]').length === 3);

    const tabPanels = Array.from(
      container.querySelectorAll('[role="tabpanel"]'),
    ) as HTMLDivElement[];

    expect(tabPanels[0]?.hidden).toBe(false);
    expect(tabPanels[1]?.hidden).toBe(true);
    expect(tabPanels[2]?.hidden).toBe(true);

    await clickButton(historyTab);
    await waitFor(() => tabPanels[1]?.hidden === false);
    expect(tabPanels[0]?.hidden).toBe(true);
    expect(tabPanels[2]?.hidden).toBe(true);

    await clickButton(promptsTab);
    await waitFor(() => tabPanels[2]?.hidden === false);
    expect(tabPanels[0]?.hidden).toBe(true);
    expect(tabPanels[1]?.hidden).toBe(true);
    expect(normalizeText(container)).toContain('dockerfile ai prompts');
  });
});
