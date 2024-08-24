import { ButtonOptions, FancyButton } from '@pixi/ui';
import { Graphics } from 'pixi.js';

class HoverPressButton extends FancyButton {
  constructor(options?: ButtonOptions) {
    super(options);

    if (!this.defaultView) {
      const otherView = this.hoverView ?? this.pressedView;
      if (otherView) {
        this.defaultView = new Graphics().rect(0, 0, otherView.width, otherView.height).fill('transparent');
      }
    }
  }
}

export {
  HoverPressButton
};