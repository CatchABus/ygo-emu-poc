import { Application, Sprite, Texture } from 'pixi.js';
import { animate } from '../animation';

const OFFSET_X = 6;
const OFFSET_Y = 16;

function createRippleSprite() {
  const rippleSprite = Sprite.from('commons/cursor_pow.png');

  rippleSprite.anchor.set(0.5, 0.5);
  rippleSprite.zIndex = 1000;
  rippleSprite.eventMode = 'none';
  rippleSprite.alpha = 0;

  return rippleSprite;
}

function initCursor(app: Application): void {
  const centerX = app.renderer.width / 2;
  const centerY = app.renderer.height / 2;
  const rippleScale = {
    x: 0.5,
    y: 0.5
  };

  const defaultCursorTexture = Texture.from('commons/cursor00.png');
  const pointerCursorTexture = Texture.from('commons/cursor01.png');

  const cursorSprite = new Sprite({
    texture: defaultCursorTexture
  });
  cursorSprite.label = 'cursor';
  cursorSprite.x = centerX - OFFSET_X;
  cursorSprite.y = centerY - OFFSET_Y;
  cursorSprite.zIndex = 1010;
  cursorSprite.eventMode = 'none';

  app.renderer.events.cursorStyles.default = 'none';
  app.renderer.events.cursorStyles.hover = 'none';
  app.renderer.events.cursorStyles.pointer = 'none';
  app.stage.eventMode = 'static';

  app.stage.onpointermove = event => {
    cursorSprite.x = event.globalX - OFFSET_X;
    cursorSprite.y = event.globalY - OFFSET_Y;
  };

  app.stage.onpointerdown = (event) => {
    if (event.button > 0) {
      return;
    }

    cursorSprite.texture = pointerCursorTexture;

    const rippleSprite = createRippleSprite();
    rippleSprite.label = 'cursorEffect';
    rippleSprite.x = event.globalX;
    rippleSprite.y = event.globalY;
    rippleSprite.scale.set(rippleScale.x, rippleScale.y)
    app.stage.addChild(rippleSprite);

    animate({
      from: 1,
      to: 0,
      duration: 500,
      onUpdate: (value: number) => {
        const scaleValue = 1.2 * (1 - value);

        rippleSprite.alpha = value;
        rippleSprite.scale.set(rippleScale.x + scaleValue, rippleScale.y + scaleValue);
      },
      onComplete: () => {
        app.stage.removeChild(rippleSprite);
        rippleSprite.destroy();
      }
    })
  };

  app.stage.onpointerup = () => {
    cursorSprite.texture = defaultCursorTexture;
  };

  app.stage.addChild(cursorSprite);
}

export {
  initCursor
};