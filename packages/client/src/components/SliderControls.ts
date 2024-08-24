import { Slider } from '@pixi/ui';
import { Container, DestroyOptions, FederatedEvent } from 'pixi.js';
import { AnimationWrapper, animate } from '../animation';
import { linear } from 'popmotion';

interface SliderControlOptions {
  decreaseView: Container;
  increaseView: Container;
  slider: Slider;
  bg?: Container;
}

class SliderControls extends Container {
  private _slider: Slider;

  private _sliderUpdateAnimation: AnimationWrapper = null;

  constructor(options?: SliderControlOptions) {
    super();

    if (options) {
      this.init(options);
    }
  }

  get slider(): Slider {
    return this._slider;
  }

  private _updateSlider(toIncrease: boolean): void {
    const max = this._slider.max;
    const fromValue = this._slider.value;
    const toValue: number = toIncrease ? max : 0;
    const diff = toValue > fromValue ? toValue - fromValue : fromValue - toValue;

    if (this._sliderUpdateAnimation) {
      this._sliderUpdateAnimation.stop();
      this._sliderUpdateAnimation = null;
    }

    if (diff > 0) {
      this._sliderUpdateAnimation = animate({
        from: fromValue,
        to: toValue,
        duration: (1000 / max) * diff,
        ease: linear,
        onUpdate: (value: number) => {
          this._slider.value = value;
        },
        onComplete: () => {
          this._sliderUpdateAnimation = null;
        }
      });
    }
  }

  init(options: SliderControlOptions) {
    const pointerDownCallback = (event: FederatedEvent) => {
      this._updateSlider(event.currentTarget === increaseView);
    };

    const pointerUpCallback = () => {
      if (this._sliderUpdateAnimation) {
        this._sliderUpdateAnimation.stop();
        this._sliderUpdateAnimation = null;
      }
    };

    const { decreaseView, slider, increaseView } = options;

    decreaseView.onpointerdown = pointerDownCallback;
    decreaseView.onpointerup = pointerUpCallback;
    increaseView.onpointerdown = pointerDownCallback;
    increaseView.onpointerup = pointerUpCallback;

    this._slider = slider;

    if (options.bg) {
      this.addChild(options.bg);
    }

    this.addChild(decreaseView, slider, increaseView);
  }

  destroy(options: DestroyOptions): void {
    super.destroy(options);

    if (this._sliderUpdateAnimation) {
      this._sliderUpdateAnimation.stop();
      this._sliderUpdateAnimation = null;
    }
  }
}

export {
  SliderControls,
  SliderControlOptions
}