import { Atom } from 'nanostores';
import { Container, ContainerChild, ContainerOptions, DestroyOptions } from 'pixi.js';
import { AnimationOptions } from 'popmotion';
import { animate, AnimationWrapper } from '../animation';
import { client } from '../client';
import { createRect, SCREEN_HEIGHT, SCREEN_WIDTH } from '../util/helpers';

abstract class BasePage extends Container {
  private readonly mRunningAnimations: AnimationWrapper[] = [];
  private mUnbindCbs: Array<() => void>;

  constructor(options?: ContainerOptions<ContainerChild>, fitsWindow: boolean = true) {
    super(options);

    if (fitsWindow) {
      this.addChild(createRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT));
    }
  }

  override destroy(options?: DestroyOptions): void {
    const unbindCbs = this.mUnbindCbs;

    super.destroy(options);

    if (Array.isArray(unbindCbs)) {
      for (const cb of unbindCbs) {
        cb();
      }
      unbindCbs.splice(0);
    }
  }

  resize(width: number, height: number): void {
    this.setSize(width, height);
  }

  subscribeStore<T>(atom: Atom<T>, listener: (value: T, oldValue?: T) => void): void {
    if (!this.mUnbindCbs) {
      this.mUnbindCbs = [];
    }
    this.mUnbindCbs.push(atom.subscribe(listener));
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

    this.mRunningAnimations.push(animation);

    return animation;
  }

  removeAnimation(animation: AnimationWrapper): void {
    const index = this.mRunningAnimations.indexOf(animation);
    if (index >= 0) {
      this.mRunningAnimations.splice(index, 1);
    }
  }

  stopAllAnimations(): void {
    // Keep a copy of the original array to avoid modifications during for loop
    const animationsCopy = [...this.mRunningAnimations];

    for (const animation of animationsCopy) {
      animation.stop();
    }
  }

  setPageInteraction(val: boolean): void {
    const { features: eventFeatures } = client.getApplication().renderer.events;

    eventFeatures.click = val;
    eventFeatures.wheel = val;
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

