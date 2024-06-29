/// <reference types="vite/client" />

declare module globalThis {
  var __onLiveSync: (newModule: any, modulePathname: string) => void;
  var __PIXI_APP__: import('pixi.js').Application;
}

declare const __SUPPORTED_GAME_MODES__: GameMode[];

interface ImportMetaEnv {
  readonly YGO_FULL_CARD_SET_ENABLED: string;
  readonly YGO_WRITE_PACKET_MAX_SIZE: string;
  readonly YGO_WINDOW_WIDTH: string;
  readonly YGO_WINDOW_HEIGHT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type GameMode = 'joey' | 'kaiba' | 'yugi';