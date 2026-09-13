import { defineConfig } from 'vite';
import hmrPlugin from './vite-hmr';

export default defineConfig((config) => {
  return {
    envPrefix: 'YGO_',
    define: {
      __SUPPORTED_GAME_MODES__: ['joey', 'kaiba', 'yugi']
    },
    plugins: [hmrPlugin()]
  };
});