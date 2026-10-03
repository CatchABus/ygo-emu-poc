import { FancyButton, Input } from '@pixi/ui';
import { AnimatedSprite, Container, Graphics, Sprite, Text } from 'pixi.js';

export type PixiElement = Container | Graphics | Sprite | AnimatedSprite | Text | Input | FancyButton;