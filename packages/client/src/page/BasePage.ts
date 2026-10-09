import { Container, ContainerChild, ContainerOptions } from 'pixi.js';
import { AnimationWrapper, animate } from '../animation';
import { AnimationOptions } from 'popmotion';
import { createRect, SCREEN_HEIGHT, SCREEN_WIDTH } from '../util/helpers';

abstract class BasePage extends Container {
  private readonly _runningAnimations: AnimationWrapper[] = [];

  constructor(options?: ContainerOptions<ContainerChild>, fitsWindow: boolean = true) {
    super(options);

    if (fitsWindow) {
      this.addChild(createRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT));
    }
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