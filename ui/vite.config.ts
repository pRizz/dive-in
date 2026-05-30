import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const readPackageVersion = () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  ) as { version?: string };
  return packageJson.version?.trim() || 'dev';
};

const packageVersion = readPackageVersion();
const maybeAppVersion = process.env.APP_VERSION?.trim();
const maybeGitCommit = process.env.GIT_COMMIT?.trim();

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(maybeAppVersion || packageVersion),
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(maybeGitCommit || ''),
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
  },
});
