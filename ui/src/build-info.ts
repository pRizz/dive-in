import { GITHUB_URL } from './constants';

const DEFAULT_APP_VERSION = 'dev';
const GIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const COMMIT_DISPLAY_LENGTH = 12;

export interface BuildInfoCommit {
  value: string;
  shortValue: string;
  maybeUrl?: string;
}

export interface BuildInfo {
  version: string;
  maybeCommit?: BuildInfoCommit;
}

interface ResolveBuildInfoInput {
  maybeVersion?: string;
  maybeCommit?: string;
  repositoryUrl?: string;
}

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

export const resolveBuildInfo = (input: ResolveBuildInfoInput): BuildInfo => {
  const version = input.maybeVersion?.trim() || DEFAULT_APP_VERSION;
  const maybeCommit = input.maybeCommit?.trim();

  if (!maybeCommit) {
    return { version };
  }

  const shortValue = maybeCommit.slice(0, COMMIT_DISPLAY_LENGTH);
  const repositoryUrl = input.repositoryUrl?.trim();
  const maybeUrl =
    repositoryUrl && GIT_SHA_PATTERN.test(maybeCommit)
      ? `${trimTrailingSlashes(repositoryUrl)}/commit/${maybeCommit}`
      : undefined;

  return {
    version,
    maybeCommit: {
      value: maybeCommit,
      shortValue,
      maybeUrl,
    },
  };
};

export const BUILD_INFO = resolveBuildInfo({
  maybeVersion: import.meta.env.VITE_APP_VERSION,
  maybeCommit: import.meta.env.VITE_GIT_COMMIT,
  repositoryUrl: GITHUB_URL,
});
