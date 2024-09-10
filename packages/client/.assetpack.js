import { audio } from '@assetpack/core/ffmpeg';
import { compress } from '@assetpack/core/image';
import { pixiManifest } from '@assetpack/core/manifest';

export default {
  cache: false,
  entry: './raw-assets',
  output: './public',
  ignore: [
    'cards{m}/images/.gitkeep'
  ],
  pipes: [
    audio({
      outputs: [
        {
          formats: ['.ogg'],
          recompress: false,
          options: {
            audioBitrate: 32,
            audioChannels: 1,
            audioFrequency: 22050,
          }
        }
      ]
    }),
    compress({
      jpg: {},
      png: { quality: 100 },
      webp: false,
      avif: false,
      bc7: false,
      astc: false,
      basis: false,
    }),
    pixiManifest()
  ]
};