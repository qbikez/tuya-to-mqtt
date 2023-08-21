/// <reference types="vite/client" />
/// https://vitejs.dev/guide/env-and-mode.html#env-variables

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
