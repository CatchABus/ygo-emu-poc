import { Button, ButtonOptions, FancyButton, InputOptions } from '@pixi/ui';
import { ReadableAtom } from 'nanostores';
import { AbstractText, AnyTextStyle, AnyTextStyleOptions, Container, ContainerOptions, FederatedPointerEvent, Graphics, GraphicsOptions, PointData, Sprite, SpriteOptions, TextOptions, TextString, TextStyle, TextStyleOptions, Texture, TextureSource } from 'pixi.js';
import { PixiElement } from './PixiElement';

export interface CommonProps {
  afterCreate?: (owner: Container) => void;
}

export interface ContainerProps extends CommonProps {
  children?: PixiElement | [PixiElement, ...PixiElement[]];
}

type Padding = number | [number, number] | [number, number, number, number] | {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

type PixiJSXProps<T> = {
	[K in keyof T]: T[K] | ReadableAtom;
};

interface SpriteProps extends CommonProps {
  texture: Texture<TextureSource<any>>;
}

interface TextProps extends CommonProps {
  text: TextString;
  style: TextStyle | TextStyleOptions;
  anchor: PointData;
}

interface InputProps extends CommonProps {
  bg: Sprite | Graphics | Texture | string;
  placeholder: string;
  textStyle: AnyTextStyle | Partial<AnyTextStyleOptions>;
  padding: Padding;
  addMask: boolean;
  secure: boolean;
}

interface FancyButtonProps extends CommonProps {
  text: string | number | AbstractText;
  padding: Padding;
  defaultView: Container | Sprite | Graphics;
  hoverView: Container | Sprite | Graphics;
  pressedView: Container | Sprite | Graphics;
  onUp: (btn?: Button, e?: FederatedPointerEvent) => void;
}

declare global {
  declare namespace JSX {
    interface IntrinsicElements {
      container: PixiJSXProps<Omit<ContainerOptions, 'children'> & ContainerProps>;
      graphics: PixiJSXProps<GraphicsOptions & CommonProps>;
      sprite: PixiJSXProps<SpriteOptions & CommonProps>;
      text: PixiJSXProps<TextOptions & CommonProps>;
      input: PixiJSXProps<InputOptions & CommonProps>;
      fancyButton: PixiJSXProps<ButtonOptions  & CommonProps & {
        /** Event that is fired when the button is down. */
        ['onDownSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
        /**
         * Event that fired when a down event happened inside the button
         * and up event happened inside or outside of the button
         */
        ['onUpSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
        /**
         * Event that fired when mouse up event happens outside of the button
         * after the down event happened inside the button boundaries.
         */
        ['onUpOutSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
        /** Event that fired when the mouse is out of the view */
        ['onOutSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
        /** Event that is fired when the button is pressed. */
        ['onPressSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
        /** Event that is fired when the mouse hovers the button. Fired only if device is not mobile.*/
        ['onHoverSignal']?: (btn?: FancyButton, e?: FederatedPointerEvent) => void;
      }>;
    }
  }
}