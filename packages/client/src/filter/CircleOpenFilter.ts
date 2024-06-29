import { Filter, GlProgram } from 'pixi.js';
import transitionVertex from './transition.vert?raw';

// author: gre
// license: MIT
const FRAGMENT = `
uniform sampler2D uTexture;
uniform float progress;

in vec2 vTextureCoord;
in vec2 vFilterCoord;

uniform float smoothness; // = 0.3
uniform float scale; // = 1.0
uniform vec2 center; // = vec2(0.5, 0.5);
uniform int opening; // = 0

const float SQRT_2 = 1.414213562373;

vec4 transition (vec2 uv) {
  float x = (opening == 1 ? progress : 1.-progress) * scale;
  float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, vFilterCoord) - x*(1.+smoothness));
  return mix(texture2D(uTexture, uv), vec4(0.0, 0.0, 0.0, 0), opening == 1 ? 1.-m : m);
}

void main(){
    vec2 uv = vTextureCoord.xy;
    gl_FragColor = transition(vTextureCoord);
}
`;

class CircleOpenFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        vertex: transitionVertex
      }),
      resources: {
        uniformWrapper: {
          opening: { value: 0, type: 'i32' },
          center: { value: { x: 0.5, y: 0.5}, type: 'vec2<f32>' },
          smoothness: { value: 0.0, type: 'f32' },
          scale: { value: 1.0, type: 'f32' },
          progress: { value: 0, type: 'f32' }
        },
      }
    });
  }
}

export {
  CircleOpenFilter
};