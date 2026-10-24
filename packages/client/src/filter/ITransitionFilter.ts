import { Filter } from 'pixi.js';

export interface ITransitionFilter extends Filter {
  get progress(): number;
  set progress(val: number);
}