import { AnimationOptions, Driver, animate as animatePopmotion } from 'popmotion';
import { getApplication } from '../util/application-helper';

interface AnimationWrapper {
    stop: () => void;
    finished: Promise<void>;
}

const tickerDriver: Driver = (update) => {
  const { ticker } = getApplication();
  const callback = () => update(ticker.deltaMS)

  return {
    start: () => ticker.add(callback),
    stop: () => ticker.remove(callback)
  };
};

function animate<T>(options: AnimationOptions<T>): AnimationWrapper {
  let resolveCallback: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveCallback = resolve;
  })

  const animation = animatePopmotion({
    ...options,
    driver: tickerDriver,
    onComplete: () => {
      if (options.onComplete) {
        options.onComplete();
      }

      resolveCallback();
    }
  });
    
  return {
    stop: () => animation.stop(),
    finished
  };
}

export {
  animate,
  AnimationWrapper
};