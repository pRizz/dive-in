import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { DiveResponse, HistoryEntry, HistoryMetadata } from './models';

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

const BASE_DIVE_RESPONSE: DiveResponse = {
  image: {
    sizeBytes: 1000,
    inefficientBytes: 200,
    efficiencyScore: 0.8,
    fileReference: [],
  },
  layer: [],
};

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }
    await act(async () => {
      await Promise.resolve();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for condition.');
}

async function waitForButton(container: HTMLElement, label: string, index = 0) {
  await waitFor(() => findButtons(container, label).length > index);
  return findButtons(container, label)[index];
}

async function clickButton(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
  });
}

function createMetadata(
  id: string,
  image: string,
  imageId: string,
  completedAt: string,
): HistoryMetadata {
  return {
    id,
    image,
    imageId,
    source: 'docker',
    createdAt: completedAt,
    completedAt,
    summary: {
      sizeBytes: 1000,
      inefficientBytes: 200,
      efficiencyScore: 0.8,
    },
  };
}

function createEntry(metadata: HistoryMetadata): HistoryEntry {
  return {
    metadata,
    result: BASE_DIVE_RESPONSE,
  };
}

describe('App scroll behavior for analysis details', () => {
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

  it('does not scroll before View analysis data resolves and scrolls once when analysis appears', async () => {
    const completedAt = '2026-02-07T12:00:00.000Z';
    const metadata = createMetadata('history-1', 'repo/app:latest', 'sha256:image-1', completedAt);
    const entryDeferred = createDeferred<HistoryEntry>();
    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [metadata];
      }
      if (path === '/history/history-1') {
        return entryDeferred.promise;
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

    const scrollWhenDetailVisible: boolean[] = [];
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      scrollWhenDetailVisible.push((container.textContent ?? '').includes('Back to images'));
    });

    await act(async () => {
      root.render(<App />);
    });

    const viewAnalysisButton = await waitForButton(container, 'view analysis');
    await clickButton(viewAnalysisButton);
    expect(scrollSpy).not.toHaveBeenCalled();

    await act(async () => {
      entryDeferred.resolve(createEntry(metadata));
      await entryDeferred.promise;
    });

    await waitFor(() => (container.textContent ?? '').includes('Back to images'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollWhenDetailVisible).toEqual([true]);
  });

  it('queues top scroll for compare and runs it after compare view is rendered', async () => {
    const completedAt = '2026-02-07T12:00:00.000Z';
    const leftMetadata = createMetadata('left-id', 'repo/base:1.0', 'sha256:left', completedAt);
    const rightMetadata = createMetadata(
      'right-id',
      'repo/target:2.0',
      'sha256:right',
      completedAt,
    );
    const serviceGet = vi.fn(async (path: string) => {
      if (path === '/checkdive') {
        return {};
      }
      if (path === '/history') {
        return [leftMetadata, rightMetadata];
      }
      if (path === '/history/left-id') {
        return createEntry(leftMetadata);
      }
      if (path === '/history/right-id') {
        return createEntry(rightMetadata);
      }
      throw new Error(`Unhandled GET ${path}`);
    });
    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => []),
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

    const scrollDuringCompareView: boolean[] = [];
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      scrollDuringCompareView.push((container.textContent ?? '').includes('Compare history'));
    });

    await act(async () => {
      root.render(<App />);
    });

    const historyTab = await waitForButton(container, 'history');
    await clickButton(historyTab);

    const baselineButton = await waitForButton(container, 'set baseline', 0);
    await clickButton(baselineButton);
    const targetButton = await waitForButton(container, 'set target', 1);
    await clickButton(targetButton);
    const compareButton = await waitForButton(container, 'compare');

    expect(scrollSpy).not.toHaveBeenCalled();
    await clickButton(compareButton);

    await waitFor(() => (container.textContent ?? '').includes('Compare history'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollDuringCompareView).toEqual([true]);
  });

  it('delays scroll for job-complete analysis until the result view is shown', async () => {
    const resultDeferred = createDeferred<DiveResponse>();
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
          status: 'succeeded',
          elapsedSeconds: 2,
        };
      }
      if (path === '/analysis/job-1/result') {
        return resultDeferred.promise;
      }
      throw new Error(`Unhandled GET ${path}`);
    });
    const servicePost = vi.fn(async (path: string) => {
      if (path === '/analyze') {
        return {
          jobId: 'job-1',
          status: 'queued',
        };
      }
      throw new Error(`Unhandled POST ${path}`);
    });
    createDockerDesktopClientMock.mockReturnValue({
      docker: {
        listImages: vi.fn(async () => [
          {
            RepoTags: ['repo/analyze:latest'],
            Id: 'sha256:analyze-image',
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
            post: servicePost,
            delete: vi.fn(),
          },
        },
      },
      host: {
        openExternal: vi.fn(),
      },
    } as never);

    const scrollWhenDetailVisible: boolean[] = [];
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      scrollWhenDetailVisible.push((container.textContent ?? '').includes('Back to images'));
    });

    await act(async () => {
      root.render(<App />);
    });

    const analyzeButton = await waitForButton(container, 'analyze');
    await clickButton(analyzeButton);

    await waitFor(() =>
      serviceGet.mock.calls.some((call) => (call[0] as string) === '/analysis/job-1/result'),
    );
    expect(scrollSpy).not.toHaveBeenCalled();

    await act(async () => {
      resultDeferred.resolve(BASE_DIVE_RESPONSE);
      await resultDeferred.promise;
    });

    await waitFor(() => (container.textContent ?? '').includes('Back to images'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollWhenDetailVisible).toEqual([true]);
  });
});
