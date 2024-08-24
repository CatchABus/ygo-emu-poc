import i18next from 'i18next';
import { CardTemplate } from '../template/CardTemplate';
import { groupD8, Rectangle, Texture } from 'pixi.js';

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

function rotateTexture(rotate: number, texture: Texture): Texture {
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
  rotateTexture
};