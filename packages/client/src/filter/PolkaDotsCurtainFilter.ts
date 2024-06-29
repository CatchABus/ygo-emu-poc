import { Filter, GlProgram } from 'pixi.js';
import transitionVertex from './transition.vert?raw';

// author: bobylito
// license: MIT
const FRAGMENT = `
uniform sampler2D uTexture;
uniform float progress;

in vec2 vTextureCoord;
in vec2 vFilterCoord;

const vec2 center = vec2(0, 0);
uniform float dots;

vec4 transition(vec2 uv) {
  bool nextImage = distance(fract(vFilterCoord * dots), vec2(0.5, 0.5)) < (progress / distance(vFilterCoord, center));
  return nextImage ? vec4(0.0, 0.0, 0.0, 0) : texture2D(uTexture, uv);
}

void main(){
    vec2 uv = vTextureCoord.xy;
    gl_FragColor = transition(vTextureCoord);
}
`;

class PolkaDotsCurtainFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        vertex: transitionVertex
      }),
      resources: {
        uniformWrapper: {
          dots: { value: 20, type: 'f32' },
          progress: { value: 0, type: 'f32' }
        },
      }
    });
  }
}

export {
  PolkaDotsCurtainFilter
};