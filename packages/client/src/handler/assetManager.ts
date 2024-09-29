import { Assets } from 'pixi.js';
import { client } from '../client';

async function initAssets() {
  const assetPrefix = client.gameMode;

  // Init PixiJS assets with this asset manifest
  await Assets.init({
    manifest: 'manifest.json'
  });

  await Assets.loadBundle(['default', 'login']);

  // Start loading all bundles in the background
  Assets.backgroundLoadBundle([
    `${assetPrefix}/menu`,
    `${assetPrefix}/options`,
    `${assetPrefix}/card_list`,
    `${assetPrefix}/deck_c`,
    'cards'
  ]);
}

export {
  initAssets
};