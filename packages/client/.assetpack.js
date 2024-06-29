import { compressJpg, compressPng } from '@assetpack/plugin-compress';
import { audio } from '@assetpack/plugin-ffmpeg';
import { pixiManifest } from '@assetpack/plugin-manifest';

export default {
  entry: './raw-assets',
  output: './public',
  plugins: {
    audio: audio({
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
    compressJpg: compressJpg(),
    compressPng: compressPng(),
    manifest: pixiManifest()
  },
};