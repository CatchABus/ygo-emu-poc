import { ButtonContainer } from '@pixi/ui';
import { Container, ContainerChild } from 'pixi.js';

class HoverButtonContainer extends ButtonContainer {
  constructor(view?: Container<ContainerChild>) {
    super(view);

    this.alpha = 0;
    this.onpointerenter = () => {
      this.alpha = 1;
    }
    this.onpointerleave = () => {
      this.alpha = 0;
    }
  }

  setInteractive(val: boolean): void {
    if (val) {
      this.eventMode = 'static';
    } else {
      this.eventMode = 'none';
      this.alpha = 0;
    }
  }
}

export {
  HoverButtonContainer
};