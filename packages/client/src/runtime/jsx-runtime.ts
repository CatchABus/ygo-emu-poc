import log from 'loglevel';
import { AnimatedSprite, Container, ContainerChild, Graphics, Sprite, Text } from 'pixi.js';
import { PixiElement } from './PixiElement';
import { FancyButton, Input } from '@pixi/ui';
import { ReadableAtom } from 'nanostores';
import { ContainerProps } from './jsxElements';

const SIGNAL_SUFFIX = 'Signal';

const registry: Record<string, new (...args) => PixiElement> = {
  'container': Container,
  'graphics': Graphics,
  'sprite': Sprite,
  'animatedSprite': AnimatedSprite,
  'text': Text,
  'input': Input,
  'fancyButton': FancyButton
};

class FragmentElement {
  public readonly mChildren: PixiElement | [PixiElement, ...PixiElement[]];

  constructor(children: PixiElement | [PixiElement, ...PixiElement[]]) {
    this.mChildren = children;
  }

  *[Symbol.iterator]() {
    const children = this.mChildren;

    if (Array.isArray(children)) {
      for (const item of children) {
        yield item;
      }
    } else {
      yield children;
    }
  }
}

export const Fragment = Symbol.for('jsx.fragment');
export const jsxs = jsx;

export function jsx(elementType: string | typeof Fragment, props: ContainerProps): PixiElement | FragmentElement {
  if (elementType === Fragment) {
    return new FragmentElement(props.children);
  }

  const elClass = registry[elementType];

  if (!elClass) {
    log.error(`Unknown NativeScript view element type: ${elementType}. Make sure that the element is registered!`);
    return null;
  }

  let element: PixiElement;

  if (props) {
    let signalProps: Record<string, any>;
    let storeProps: Record<string, ReadableAtom>;
    let children: ContainerChild | ContainerChild[];

    if (props.children) {
      children = props.children;
      delete props.children;
    } else {
      children = null;
    }

    for (const key in props) {
      const val = props[key];
      const signalIdx = key.indexOf(SIGNAL_SUFFIX);

      // Special handling for pixi ui signal listeners
      if (signalIdx > -1) {
        if (!signalProps) {
          signalProps = {};
        }
        signalProps[key.substring(0, signalIdx)] = val;
        delete props[key];
      } else {
        // Nanostores handling
        if (val && typeof val === 'object' && 'set' in val && 'subscribe' in val) {
          if (!storeProps) {
            storeProps = {};
          }
          storeProps[key] = val;
          delete props[key];
        }
      }
    }

    element = new elClass(props);

    if (typeof props.afterCreate === 'function') {
      props.afterCreate(element);
    }

    // Pixi UI signal listeners
    if (signalProps) {
      for (const key in signalProps) {
        if (typeof signalProps[key] === 'function' && element[key]) {
          element[key].connect(signalProps[key]);
        }
      }
    }

    // Nanostores reactivity
    if (storeProps) {
      for (const key in storeProps) {
        const storeVal = storeProps[key];

        const unsubscribe = storeVal.subscribe((newVal) => {
          element[key] = newVal;
        });
        element.once('destroyed', () => unsubscribe());
      }
    }

    if (children != null) {
      if (Array.isArray(children) || children instanceof FragmentElement) {
        element.addChild(...children);
      } else {
        element.addChild(children);
      }
    }
  }

  return element;
}