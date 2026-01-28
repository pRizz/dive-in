import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';

import { App } from './App';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DockerMuiThemeProvider>
        <CssBaseline />
        <App />
      </DockerMuiThemeProvider>
    </React.StrictMode>,
  );
}
