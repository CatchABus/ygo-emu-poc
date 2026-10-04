import { Assets } from 'pixi.js';
import { client } from '../client';


async function initAssets() {
  const assetPrefix = client.gameMode;

  const manifest = await Assets.load({
    src: 'manifest.json'
  });

  for (const bundle of manifest.bundles) {
    if (bundle.name !== 'cards') {
      for (const asset of bundle.assets) {
        asset.data.resolution = 2;
      }
    }
  }
  
  Assets.resolver.addManifest(manifest);

  await Assets.loadBundle(['default', 'joey']);

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