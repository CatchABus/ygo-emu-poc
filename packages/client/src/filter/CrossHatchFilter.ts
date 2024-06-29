import { Filter, GlProgram } from 'pixi.js';
import transitionVertex from './transition.vert?raw';

// Author: pthrasher
// adapted by gre from https://gist.github.com/pthrasher/04fd9a7de4012cbb03f6
// license: MIT
const FRAGMENT = `
uniform sampler2D uTexture;
uniform float progress;

in vec2 vTextureCoord;
in vec2 vFilterCoord;

uniform float threshold; // = 3.0
uniform float fadeEdge; // = 0.1
uniform vec2 center; // = vec2(0.5, 0.5);

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
vec4 transition(vec2 p) {
  float dist = distance(center, p) / threshold;
  float r = progress - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x)));
  return mix(texture2D(uTexture, p), vec4(0.0, 0.0, 0.0, 0), mix(0.0, mix(step(dist, r), 1.0, smoothstep(1.0-fadeEdge, 1.0, progress)), smoothstep(0.0, fadeEdge, progress)));    
}

void main() {
    vec2 uv = vTextureCoord.xy;
    gl_FragColor = transition(vTextureCoord);
}
`;

class CrossHatchFilter extends Filter {
  constructor() {
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        vertex: transitionVertex
      }),
      resources: {
        uniformWrapper: {
          center: { value: { x: 0.5, y: 0.5}, type: 'vec2<f32>' },
          threshold: { value: 3.0, type: 'f32' },
          fadeEdge: { value: 0.1, type: 'f32' },
          progress: { value: 0, type: 'f32' }
        },
      }
    });
  }
}

export {
  CrossHatchFilter
};