import { defineConfig } from 'vite';

export default defineConfig((config) => {
  return {
    envPrefix: 'YGO_',
    define: {
      __SUPPORTED_GAME_MODES__: ['joey', 'kaiba', 'yugi']
    }
  };
});