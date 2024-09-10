import { Assets } from 'pixi.js';
import { getGameMode } from '../util/application-helper';

async function initAssets() {
  const assetPrefix = getGameMode();

  // Init PixiJS assets with this asset manifest
  await Assets.init({
    manifest: 'manifest.json'
  });

  await Assets.loadBundle(['default']);

  // Start loading all bundles in the background
  Assets.backgroundLoadBundle([
    `${assetPrefix}/splash`,
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