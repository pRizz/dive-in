import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AnalyzeResponse, DiveResponse } from './models';

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

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const BASE_DIVE_RESPONSE: DiveResponse = {
  image: {
    sizeBytes: 1000,
    inefficientBytes: 200,
    efficiencyScore: 0.8,
    fileReference: [],
  },
  layer: [],
};

function normalizeText(node: Element) {
  return node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function pageText() {
  return normalizeText(document.body);
}

function findButtons(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return Array.from(document.body.querySelectorAll('button')).filter(
    (button): button is HTMLButtonElement => normalizeText(button) === normalizedLabel,
  );
}

function findInputByLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const labels = Array.from(document.body.querySelectorAll('label'));
  const matching = labels.find((node) => normalizeText(node) === normalizedLabel);
  if (!matching) {
    return undefined;
  }
  const inputId = matching.getAttribute('for');
  if (!inputId) {
    return undefined;
  }
  return document.body.querySelector(`input[id="${inputId}"]`) as HTMLInputElement | undefined;
}

function findCheckboxByLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const labels = Array.from(document.body.querySelectorAll('label'));
  const matching = labels.find((node) => normalizeText(node).includes(normalizedLabel));
  if (!matching) {
    return undefined;
  }
  const nested = matching.querySelector('input[type="checkbox"]');
  if (nested instanceof HTMLInputElement) {
    return nested;
  }
  const inputId = matching.getAttribute('for');
  if (!inputId) {
    return undefined;
  }
  return document.body.querySelector(`input[id="${inputId}"]`) as HTMLInputElement | undefined;
}

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function waitFor(condition: () => boolean, timeoutMs = 4000) {
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

async function waitForButton(label: string, index = 0) {
  await waitFor(() => findButtons(label).length > index);
  return findButtons(label)[index];
}

async function clickButton(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
  });
}

async function clickCheckbox(input: HTMLInputElement) {
  await act(async () => {
    input.click();
  });
}

describe('App bulk analyze flow', () => {
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens bulk dialog, defaults to 3 days, and validates input', async () => {
    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [];
      }
      throw new Error(`Unhandled GET ${path}`);
    });

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
            get: serviceGet,
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

    const bulkButton = await waitForButton('bulk analyze...');
    await clickButton(bulkButton);

    await waitFor(() => pageText().includes('bulk analyze recent images'));
    const daysInput = findInputByLabel('Analyze images newer than X days');
    expect(daysInput).toBeDefined();
    expect(daysInput?.value).toBe('3');

    const startButton = await waitForButton('start bulk analysis');
    expect(startButton.disabled).toBe(false);

    await setInputValue(daysInput as HTMLInputElement, '');
    expect(pageText()).toContain('days is required');
    expect(startButton.disabled).toBe(true);

    await setInputValue(daysInput as HTMLInputElement, '0');
    expect(startButton.disabled).toBe(false);

    const cancelButton = await waitForButton('cancel');
    await clickButton(cancelButton);
    await waitFor(() => !pageText().includes('bulk analyze recent images'));
  });

  it('computes preview counts from visible images including skip already analyzed', async () => {
    const nowMs = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [
          {
            id: 'history-1',
            image: 'repo/already:latest',
            imageId: 'sha256:image-already',
            source: 'docker',
            createdAt: '2026-02-07T12:00:00.000Z',
            completedAt: '2026-02-07T12:01:00.000Z',
            summary: {
              sizeBytes: 1000,
              inefficientBytes: 200,
              efficiencyScore: 0.8,
            },
          },
        ];
      }
      throw new Error(`Unhandled GET ${path}`);
    });

    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/recent:latest'],
            Id: 'sha256:image-recent',
            RepoDigests: [],
            Created: Math.floor((nowMs - 2 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/older:latest'],
            Id: 'sha256:image-older',
            RepoDigests: [],
            Created: Math.floor((nowMs - 20 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/unknown:latest'],
            Id: 'sha256:image-unknown',
            RepoDigests: [],
            Size: 1000,
          },
          {
            RepoTags: ['repo/already:latest'],
            Id: 'sha256:image-already',
            RepoDigests: [],
            Created: Math.floor((nowMs - 1 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['other/hidden:latest'],
            Id: 'sha256:image-hidden',
            RepoDigests: [],
            Created: Math.floor((nowMs - 1 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
        ]),
      },
      extension: {
        vm: {
          service: {
            get: serviceGet,
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

    const filterInput = findInputByLabel('Filter by image name');
    expect(filterInput).toBeDefined();
    await setInputValue(filterInput as HTMLInputElement, 'repo/');

    const bulkButton = await waitForButton('bulk analyze...');
    await clickButton(bulkButton);

    await waitFor(() => pageText().includes('visible images: 4'));
    expect(pageText()).toContain('eligible to analyze: 1');
    expect(pageText()).toContain('skipped as older: 1');
    expect(pageText()).toContain('skipped (unknown build time): 1');
    expect(pageText()).toContain('skipped (already analyzed): 1');
  });

  it('shows refresh loading feedback and prevents rapid multi-clicks for at least 400ms', async () => {
    const listImages = vi.fn(async () => [
      {
        RepoTags: ['repo/app:latest'],
        Id: 'sha256:image-1',
        RepoDigests: [],
        Created: 1700000000,
        Size: 1000,
      },
    ]);
    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [];
      }
      throw new Error(`Unhandled GET ${path}`);
    });

    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages,
      },
      extension: {
        vm: {
          service: {
            get: serviceGet,
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

    const refreshButton = await waitForButton('refresh list');
    const initialCalls = listImages.mock.calls.length;

    vi.useFakeTimers();

    await clickButton(refreshButton);
    await act(async () => {
      await Promise.resolve();
    });
    expect(listImages.mock.calls.length).toBe(initialCalls + 1);
    const refreshingButton = findButtons('refreshing...')[0] as HTMLButtonElement | undefined;
    expect(refreshingButton).toBeDefined();
    expect(refreshingButton?.disabled).toBe(true);

    await clickButton(refreshingButton as HTMLButtonElement);
    expect(listImages.mock.calls.length).toBe(initialCalls + 1);

    await act(async () => {
      vi.advanceTimersByTime(399);
      await Promise.resolve();
    });
    expect(findButtons('refreshing...').length).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    const refreshButtonAfterDelay = findButtons('refresh list')[0] as HTMLButtonElement | undefined;
    expect(refreshButtonAfterDelay).toBeDefined();
    expect(refreshButtonAfterDelay?.disabled).toBe(false);
  });

  it('runs sequentially, continues after failures, and shows a final report while staying on list view', async () => {
    const nowMs = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const firstAnalyzeDeferred = createDeferred<AnalyzeResponse>();
    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [];
      }
      if (path === '/analysis/job-1/status') {
        return {
          jobId: 'job-1',
          status: 'failed',
          message: 'first failed',
          elapsedSeconds: 1,
        };
      }
      if (path === '/analysis/job-2/status') {
        return {
          jobId: 'job-2',
          status: 'succeeded',
          elapsedSeconds: 2,
        };
      }
      throw new Error(`Unhandled GET ${path}`);
    });

    const servicePost = vi.fn(async (path: string, payload: unknown) => {
      if (path !== '/analyze') {
        throw new Error(`Unhandled POST ${path}`);
      }
      const analyzePayload = payload as { image: string };
      if (analyzePayload.image === 'repo/first:latest') {
        return firstAnalyzeDeferred.promise;
      }
      if (analyzePayload.image === 'repo/second:latest') {
        return {
          jobId: 'job-2',
          status: 'queued',
        };
      }
      throw new Error(`Unexpected image target ${(payload as { image?: string }).image}`);
    });

    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/first:latest'],
            Id: 'sha256:image-first',
            RepoDigests: [],
            Created: Math.floor((nowMs - 1 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/second:latest'],
            Id: 'sha256:image-second',
            RepoDigests: [],
            Created: Math.floor((nowMs - 2 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
        ]),
      },
      extension: {
        vm: {
          service: {
            get: serviceGet,
            post: servicePost,
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

    const bulkButton = await waitForButton('bulk analyze...');
    await clickButton(bulkButton);

    const startButton = await waitForButton('start bulk analysis');
    await clickButton(startButton);

    await waitFor(() => findButtons('bulk analyze...')[0]?.disabled === true);

    await act(async () => {
      firstAnalyzeDeferred.resolve({
        jobId: 'job-1',
        status: 'queued',
      });
      await firstAnalyzeDeferred.promise;
    });

    await waitFor(() => pageText().includes('bulk analysis complete for images newer than 3 days'));

    const analyzePostCalls = servicePost.mock.calls.filter((call) => call[0] === '/analyze');
    expect(analyzePostCalls).toHaveLength(2);
    expect((analyzePostCalls[0][1] as { image: string }).image).toBe('repo/first:latest');
    expect((analyzePostCalls[1][1] as { image: string }).image).toBe('repo/second:latest');

    expect(pageText()).toContain('succeeded: 1 | failed: 1');
    expect(pageText()).toContain('repo/first:latest: first failed');
    expect(pageText()).toContain('choose an image below to get started');
    expect(
      serviceGet.mock.calls.some(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('/result'),
      ),
    ).toBe(false);
    expect(findButtons('bulk analyze...')[0]?.disabled).toBe(false);
  });

  it('forces re-analysis of already analyzed images when checkbox is enabled', async () => {
    const nowMs = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [
          {
            id: 'history-1',
            image: 'repo/first:latest',
            imageId: 'sha256:image-first',
            source: 'docker',
            createdAt: '2026-02-07T12:00:00.000Z',
            completedAt: '2026-02-07T12:01:00.000Z',
            summary: {
              sizeBytes: 1000,
              inefficientBytes: 200,
              efficiencyScore: 0.8,
            },
          },
        ];
      }
      if (path === '/history/history-1') {
        return {
          metadata: {
            id: 'history-1',
            image: 'repo/first:latest',
            imageId: 'sha256:image-first',
            source: 'docker',
            createdAt: '2026-02-07T12:00:00.000Z',
            completedAt: '2026-02-07T12:01:00.000Z',
            summary: {
              sizeBytes: 1000,
              inefficientBytes: 200,
              efficiencyScore: 0.8,
            },
          },
          result: BASE_DIVE_RESPONSE,
        };
      }
      if (path === '/analysis/job-1/status') {
        return {
          jobId: 'job-1',
          status: 'succeeded',
          elapsedSeconds: 1,
        };
      }
      if (path === '/analysis/job-2/status') {
        return {
          jobId: 'job-2',
          status: 'succeeded',
          elapsedSeconds: 1,
        };
      }
      throw new Error(`Unhandled GET ${path}`);
    });

    const servicePost = vi.fn(async (path: string) => {
      if (path !== '/analyze') {
        throw new Error(`Unhandled POST ${path}`);
      }
      const callIndex = servicePost.mock.calls.length;
      return {
        jobId: `job-${callIndex}`,
        status: 'queued',
      };
    });

    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/first:latest'],
            Id: 'sha256:image-first',
            RepoDigests: [],
            Created: Math.floor((nowMs - 1 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/second:latest'],
            Id: 'sha256:image-second',
            RepoDigests: [],
            Created: Math.floor((nowMs - 2 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
        ]),
      },
      extension: {
        vm: {
          service: {
            get: serviceGet,
            post: servicePost,
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

    const bulkButton = await waitForButton('bulk analyze...');
    await clickButton(bulkButton);

    await waitFor(() => pageText().includes('eligible to analyze: 1'));
    const forceCheckbox = findCheckboxByLabel('force re-analyze already analyzed images');
    expect(forceCheckbox).toBeDefined();
    await clickCheckbox(forceCheckbox as HTMLInputElement);
    await waitFor(() => pageText().includes('eligible to analyze: 2'));

    const startButton = await waitForButton('start bulk analysis');
    await clickButton(startButton);

    await waitFor(() => pageText().includes('bulk analysis complete for images newer than 3 days'));

    const analyzePostCalls = servicePost.mock.calls.filter((call) => call[0] === '/analyze');
    expect(analyzePostCalls).toHaveLength(2);
    const postedImages = analyzePostCalls.map((call) => (call[1] as { image: string }).image);
    expect(postedImages).toContain('repo/first:latest');
    expect(postedImages).toContain('repo/second:latest');
    expect(pageText()).toContain('force re-analyze: yes');

    const viewButton = (await waitForButton('view analysis')) as HTMLButtonElement;
    await clickButton(viewButton);
    await waitFor(() => pageText().includes('back to images'));
    expect(pageText()).not.toContain('bulk analysis complete for images newer than 3 days');

    const backToImagesButton = await waitForButton('back to images');
    await clickButton(backToImagesButton);
    await waitFor(() => pageText().includes('bulk analysis complete for images newer than 3 days'));

    const dismissButton = await waitForButton('dismiss');
    await clickButton(dismissButton);
    await waitFor(() => !pageText().includes('bulk analysis complete for images newer than 3 days'));

    const viewButtonAfterDismiss = await waitForButton('view analysis');
    await clickButton(viewButtonAfterDismiss);
    await waitFor(() => pageText().includes('back to images'));
    const backToImagesAgainButton = await waitForButton('back to images');
    await clickButton(backToImagesAgainButton);
    expect(pageText()).not.toContain('bulk analysis complete for images newer than 3 days');
  });

  it('allows view during bulk and supports cancel after current image', async () => {
    const nowMs = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const firstAnalyzeDeferred = createDeferred<AnalyzeResponse>();
    const historyMetadata = {
      id: 'history-1',
      image: 'repo/first:latest',
      imageId: 'sha256:image-first',
      source: 'docker',
      createdAt: '2026-02-07T12:00:00.000Z',
      completedAt: '2026-02-07T12:01:00.000Z',
      summary: {
        sizeBytes: 1000,
        inefficientBytes: 200,
        efficiencyScore: 0.8,
      },
    };

    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [historyMetadata];
      }
      if (path === '/history/history-1') {
        return {
          metadata: historyMetadata,
          result: BASE_DIVE_RESPONSE,
        };
      }
      if (path === '/analysis/job-1/status') {
        return {
          jobId: 'job-1',
          status: 'succeeded',
          elapsedSeconds: 1,
        };
      }
      throw new Error(`Unhandled GET ${path}`);
    });

    const servicePost = vi.fn(async (path: string, payload: unknown) => {
      if (path !== '/analyze') {
        throw new Error(`Unhandled POST ${path}`);
      }
      const analyzePayload = payload as { image: string };
      if (analyzePayload.image === 'repo/first:latest') {
        return firstAnalyzeDeferred.promise;
      }
      if (analyzePayload.image === 'repo/second:latest') {
        return {
          jobId: 'job-2',
          status: 'queued',
        };
      }
      if (analyzePayload.image === 'repo/third:latest') {
        return {
          jobId: 'job-3',
          status: 'queued',
        };
      }
      throw new Error(`Unexpected image target ${(payload as { image?: string }).image}`);
    });

    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/first:latest'],
            Id: 'sha256:image-first',
            RepoDigests: [],
            Created: Math.floor((nowMs - 1 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/second:latest'],
            Id: 'sha256:image-second',
            RepoDigests: [],
            Created: Math.floor((nowMs - 2 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
          {
            RepoTags: ['repo/third:latest'],
            Id: 'sha256:image-third',
            RepoDigests: [],
            Created: Math.floor((nowMs - 2 * 24 * 60 * 60 * 1000) / 1000),
            Size: 1000,
          },
        ]),
      },
      extension: {
        vm: {
          service: {
            get: serviceGet,
            post: servicePost,
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

    const bulkButton = await waitForButton('bulk analyze...');
    await clickButton(bulkButton);

    const forceCheckbox = findCheckboxByLabel('force re-analyze already analyzed images');
    expect(forceCheckbox).toBeDefined();
    await clickCheckbox(forceCheckbox as HTMLInputElement);

    const startButton = await waitForButton('start bulk analysis');
    await clickButton(startButton);

    await waitFor(() => pageText().includes('bulk analysis in progress'));
    const viewButtons = findButtons('view analysis');
    expect(viewButtons.length).toBeGreaterThan(0);
    expect(viewButtons[0].disabled).toBe(false);
    await clickButton(viewButtons[0]);
    await waitFor(() => pageText().includes('back to images'));
    expect(pageText()).toContain('cancel bulk');

    const cancelBulkButton = await waitForButton('cancel bulk');
    await clickButton(cancelBulkButton);
    await waitFor(() => pageText().includes('stopping after current image finishes'));

    await act(async () => {
      firstAnalyzeDeferred.resolve({
        jobId: 'job-1',
        status: 'queued',
      });
      await firstAnalyzeDeferred.promise;
    });

    await waitFor(() => !pageText().includes('bulk analysis in progress'));
    expect(pageText()).not.toContain('bulk analysis cancelled for images newer than 3 days');
    const backToImagesButton = await waitForButton('back to images');
    await clickButton(backToImagesButton);
    await waitFor(() =>
      pageText().includes('bulk analysis cancelled for images newer than 3 days'),
    );
    const analyzePostCalls = servicePost.mock.calls.filter((call) => call[0] === '/analyze');
    expect(analyzePostCalls).toHaveLength(1);
    expect(pageText()).toContain('remaining not run: 2');
  });
});
