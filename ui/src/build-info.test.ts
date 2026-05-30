import { describe, expect, it } from 'vitest';
import { resolveBuildInfo } from './build-info';

describe('resolveBuildInfo', () => {
  it('trims and keeps an explicit version', () => {
    const buildInfo = resolveBuildInfo({
      maybeVersion: ' 1.2.3 ',
    });

    expect(buildInfo).toEqual({
      version: '1.2.3',
    });
  });

  it('falls back to dev when no version is available', () => {
    const buildInfo = resolveBuildInfo({
      maybeVersion: ' ',
    });

    expect(buildInfo.version).toBe('dev');
  });

  it('omits commit metadata when no commit is available', () => {
    const buildInfo = resolveBuildInfo({
      maybeVersion: '1.2.3',
      maybeCommit: ' ',
    });

    expect(buildInfo.maybeCommit).toBeUndefined();
  });

  it('shortens SHA commits and links to the repository commit URL', () => {
    const fullCommit = '5a4e28668f2e1234567890abcdefabcdefabcdef';
    const buildInfo = resolveBuildInfo({
      maybeVersion: '1.2.3',
      maybeCommit: fullCommit,
      repositoryUrl: 'https://github.com/pRizz/deep-dive/',
    });

    expect(buildInfo.maybeCommit).toEqual({
      value: fullCommit,
      shortValue: '5a4e28668f2e',
      maybeUrl: `https://github.com/pRizz/deep-dive/commit/${fullCommit}`,
    });
  });

  it('keeps non-SHA commits unlinked', () => {
    const buildInfo = resolveBuildInfo({
      maybeVersion: '1.2.3',
      maybeCommit: 'local-dev',
      repositoryUrl: 'https://github.com/pRizz/deep-dive',
    });

    expect(buildInfo.maybeCommit).toEqual({
      value: 'local-dev',
      shortValue: 'local-dev',
      maybeUrl: undefined,
    });
  });
});
