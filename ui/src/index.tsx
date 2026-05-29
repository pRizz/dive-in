import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import type { ThemeOptions } from '@mui/material/styles';
import { DockerMuiV6ThemeProvider } from '@docker/docker-mui-theme';

import { App } from './App';

const container = document.getElementById('root');
type DockerThemeBag = {
  light: ThemeOptions;
  dark: ThemeOptions;
};

const fallbackDockerThemes: DockerThemeBag = {
  light: {
    palette: {
      mode: 'light',
    },
  },
  dark: {
    palette: {
      mode: 'dark',
    },
  },
};

const dockerThemeGlobals = globalThis as typeof globalThis & {
  __ddMuiV6Themes?: DockerThemeBag;
};

dockerThemeGlobals.__ddMuiV6Themes ??= fallbackDockerThemes;

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DockerMuiV6ThemeProvider>
        <CssBaseline />
        <App />
      </DockerMuiV6ThemeProvider>
    </React.StrictMode>,
  );
}
