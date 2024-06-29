import { Filter, GlProgram } from 'pixi.js';
import transitionVertex from './transition.vert?raw';

// author: gre
// license: MIT
const FRAGMENT = `
uniform sampler2D uTexture;
uniform float progress;

in vec2 vTextureCoord;
in vec2 vFilterCoord;

uniform vec3 color;// = vec3(0.0)
uniform float colorPhase/* = 0.4 */; // if 0.0, there is no black phase, if 0.9, the black phase is very important

vec4 transition (vec2 uv) {
  return mix(
    mix(vec4(color, 1.0), texture2D(uTexture, uv), smoothstep(1.0-colorPhase, 0.0, progress)),
    mix(vec4(color, 1.0), vec4(0.0, 0.0, 0.0, 0), smoothstep(colorPhase, 1.0, progress)),
    progress);
}

void main(){
    vec2 uv = vTextureCoord.xy;
    gl_FragColor = transition(vTextureCoord);
}
`;

class FadeColorFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        vertex: transitionVertex
      }),
      resources: {
        uniformWrapper: {
          colorPhase: { value: 0.8, type: 'f32' },
          color: { value: new Float32Array(3), type: 'vec3<f32>' },
          progress: { value: 0, type: 'f32' }
        },
      }
    });
  }
}

export {
  FadeColorFilter
};