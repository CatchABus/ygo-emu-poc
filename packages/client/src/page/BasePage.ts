import { Container, ContainerChild, ContainerOptions, Graphics } from 'pixi.js';
import { AnimationWrapper, animate } from '../animation';
import { AnimationOptions } from 'popmotion';

const WIDTH = parseFloat(import.meta.env.YGO_WINDOW_WIDTH);
const HEIGHT = parseFloat(import.meta.env.YGO_WINDOW_HEIGHT);

abstract class BasePage extends Container {
  private readonly _runningAnimations: AnimationWrapper[] = [];

  constructor(options?: ContainerOptions<ContainerChild>) {
    super(options);

    this.addChild(new Graphics().rect(0, 0, WIDTH, HEIGHT).fill('transparent'));
  }

  resize(width: number, height: number): void {
    this.setSize(width, height);
  }

  animate<T>(options: AnimationOptions<T>): AnimationWrapper {
    const animation = animate<T>({
      ...options,
      onStop: () => {
        this.removeAnimation(animation);

        if (options.onStop) {
          options.onStop();
        }
      },
      onComplete: () => {
        this.removeAnimation(animation);

        if (options.onComplete) {
          options.onComplete();
        }
      }
    });

    this._runningAnimations.push(animation);

    return animation;
  }

  removeAnimation(animation: AnimationWrapper): void {
    const index = this._runningAnimations.indexOf(animation);
    if (index >= 0) {
      this._runningAnimations.splice(index, 1);
    }
  }

  stopAllAnimations(): void {
    // Keep a copy of the original array to avoid modifications during for loop
    const animationsCopy = [...this._runningAnimations];

    for (const animation of animationsCopy) {
      animation.stop();
    }
  }

  abstract preload(): void | Promise<void>;
  abstract onNavigatedFrom(): void | Promise<void>;
  abstract onNavigatedTo(): void | Promise<void>;
  abstract onNavigatingFrom(): void | Promise<void>;
  abstract onNavigatingTo(): void | Promise<void>;
}

export {
  BasePage
};