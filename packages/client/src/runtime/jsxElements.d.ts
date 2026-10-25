import { ButtonOptions, InputOptions } from '@pixi/ui';
import { ReadableAtom } from 'nanostores';
import { Container, ContainerOptions, GraphicsOptions, SpriteOptions, TextOptions } from 'pixi.js';
import { PixiElement } from './PixiElement';

export interface CommonProps {
  afterCreate?: (owner: Container) => void;
}

export interface ContainerProps extends CommonProps {
  children?: PixiElement | [PixiElement, ...PixiElement[]];
}

type PixiJSXProps<T> = {
	[K in keyof T]: T[K] | ReadableAtom;
};

declare global {
  declare namespace JSX {
    interface IntrinsicElements {
      container: PixiJSXProps<Omit<ContainerOptions, 'children'> & ContainerProps>;
      graphics: PixiJSXProps<GraphicsOptions & CommonProps>;
      sprite: PixiJSXProps<SpriteOptions & CommonProps>;
      text: PixiJSXProps<TextOptions & CommonProps>;
      input: PixiJSXProps<InputOptions & CommonProps>;
      fancyButton: PixiJSXProps<ButtonOptions & CommonProps>;
    }
  }
}