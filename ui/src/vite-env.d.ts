/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;

  interface ImportMetaEnv {
    readonly VITE_APP_VERSION?: string;
    readonly VITE_GIT_COMMIT?: string;
  }
}

export {};
