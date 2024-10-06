import i18next from 'i18next';
import { CardTemplate } from '../template/CardTemplate';
import { ColorSource, Graphics, groupD8, Rectangle, Texture, TextureSourceLike } from 'pixi.js';

function cardNameComparator(a: CardTemplate, b: CardTemplate) {
  const name1 = i18next.t(`cards.${a.id}.name`);
  const name2 = i18next.t(`cards.${b.id}.name`);

  if (name1 < name2) {
    return -1;
  }

  if (name1 > name2) {
    return 1;
  }

  return 0;
}

function getRequestProtocol(requestedProtocol: string): string {
  return import.meta.env.YGO_SECURE_CONNECTION === 'true' ? requestedProtocol + 's' : requestedProtocol;
}

function createRect(x: number, y: number, width: number, height: number, color?: ColorSource, radius?: number): Graphics {
  const graphics = new Graphics();

  if (radius) {
    graphics.roundRect(x, y, width, height, radius);
  } else {
    graphics.rect(x, y, width, height);
  }

  return graphics.fill(color ?? 'transparent');
}

function rotateTexture(rotate: number, source: Texture | TextureSourceLike): Texture {
  let texture: Texture;

  if (source instanceof Texture) {
    texture = source;
  } else {
    texture = Texture.from(source);
  }
  
  const h = groupD8.isVertical(rotate) ? texture.frame.width : texture.frame.height;
  const w = groupD8.isVertical(rotate) ? texture.frame.height : texture.frame.width;

  const { frame } = texture;
  const newOrigin = new Rectangle(texture.frame.x, texture.frame.y, w, h);
  const trim = newOrigin;

  let rotatedTexture: Texture;

  if (rotate % 2 === 0) {
    rotatedTexture = new Texture({
      source: texture.source,
      frame,
      orig: newOrigin,
      trim,
      rotate,
    });
  }
  else {
    rotatedTexture = new Texture({
      source: texture.source,
      frame,
      orig: newOrigin,
      trim,
      rotate,
    });
  }

  return rotatedTexture;
}

export {
  cardNameComparator,
  createRect,
  getRequestProtocol,
  rotateTexture
};