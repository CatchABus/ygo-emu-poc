import { defineConfig } from 'vite';
import hmrPlugin from './vite-hmr';
import path from 'path';

export default defineConfig((config) => {
  return {
    envPrefix: 'YGO_',
    define: {
      __SUPPORTED_GAME_MODES__: ['joey', 'kaiba', 'yugi']
    },
    resolve: {
      alias: {
        'jsx-standalone': path.resolve(__dirname, 'src/runtime')
      }
    },
    plugins: [hmrPlugin()]
  };
});