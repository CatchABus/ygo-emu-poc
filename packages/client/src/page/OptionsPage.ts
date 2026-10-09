import { FancyButton, Slider } from '@pixi/ui';
import { Howl } from 'howler';
import log from 'loglevel';
import { Assets, Graphics, Sprite } from 'pixi.js';
import { client } from '../client';
import { HoverButtonContainer } from '../components/HoverButtonContainer';
import { SliderControls } from '../components/SliderControls';
import { getCurrentLocale } from '../i18n';
import { SendablePacket } from '../network/SendablePacket';
import { createRect } from '../util/helpers';
import { BasePage } from './BasePage';

class OptionsPage extends BasePage {
  private _windowModeButton: FancyButton;
  private _fullscreenButton: FancyButton;

  private readonly _clickSound: Howl;

  constructor() {
    super(undefined, false);
    this.alpha = 0;
    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });
  }

  onNavigatingTo(): void | Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    this.addChild(Sprite.from(`${assetPrefix}/options/joey_menu_op_${locale}.png`));

    this._drawVolumeBar();
    this._drawCardsetSwitch();
    this._drawFullscreenSwitch();
    this._drawForbiddenCardsControl();
  }

  async onNavigatedTo(): Promise<void> {
    document.onfullscreenchange = () => {
      this._updateWindowButtonState(!!document.fullscreenElement);
    };

    this.animate({
      from: 0,
      to: 1,
      duration: 300,
      onUpdate: (value: number) => {
        this.alpha = value;
      }
    });
  }

  onNavigatingFrom(): Promise<void> {
    document.onfullscreenchange = null;

    this.stopAllAnimations();

    return new Promise((resolve) => {
      this.animate({
        from: 1,
        to: 0,
        duration: 500,
        onUpdate: (value: number) => {
          this.alpha = value;
        },
        onComplete: resolve
      });
    });
  }

  onNavigatedFrom(): void | Promise<void> {
  }

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    await Assets.loadBundle(`${assetPrefix}/options`);
  }

  private _onPlayerOptionsChanged(): void {
    const sp = new SendablePacket();

    sp.writeFloat(client.volume);
    sp.writeInt8(Number(client.isForbiddenCardsEnabled));
    sp.writeInt8(Number(client.isFullScreenEnabled));

    try {
      client.getSocket().emit('playerOptionsUpdateRequest', sp.buffer);
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    }
  }

  private _drawVolumeBar(): void {
    const assetPrefix = client.gameMode;
    const controls = new SliderControls();
    const volumeSpritesheet = Assets.get(`${assetPrefix}/options/op_sound.json`);
    const leftHoverSprite: Sprite = Sprite.from(volumeSpritesheet.textures['item-1.png']);
    const rightHoverSprite: Sprite = Sprite.from(volumeSpritesheet.textures['item-2.png']);

    controls.x = 33;
    controls.y = 105;

    const leftButton = new HoverButtonContainer(leftHoverSprite);

    const slider = this._createVolumeSlider();
    slider.x = 32;

    const rightButton = new HoverButtonContainer(rightHoverSprite);
    rightButton.x = 336;

    controls.onSlideEnded = () => this._onPlayerOptionsChanged();
    controls.init({
      decreaseView: leftButton,
      slider,
      increaseView: rightButton
    });

    this.addChild(controls);
  }

  private _createVolumeSlider(): Slider {
    const assetPrefix = client.gameMode;
    const background = createRect(0, 0, 292, 22);
    const volumeSpritesheet = Assets.get(`${assetPrefix}/options/op_sound.json`);

    const slider = new Slider({
      bg: background,
      fill: new Graphics(),
      slider: new Sprite(volumeSpritesheet.textures['item-3.png']),
      min: 0,
      max: 100,
      value: 50,
      step: 0.01
    });
    slider.max = 1;
    slider.value = client.volume;

    slider.onUpdate.connect((value) => {
      client.volume = value;
    });

    // Send packet to server when player stops dragging the slider
    slider.onChange.connect(() => this._onPlayerOptionsChanged());

    return slider;
  }

  private _drawCardsetSwitch(): void {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    let cardsetSprite: Sprite;

    if (import.meta.env.YGO_FULL_CARD_SET_ENABLED === 'true') {
      cardsetSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_cardset0.png`);
      cardsetSprite.x = 391;
      cardsetSprite.y = 81;
    } else {
      cardsetSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_cardset1.png`);
      cardsetSprite.x = 535;
      cardsetSprite.y = 81;
    }

    this.addChild(cardsetSprite);
  }

  private _drawFullscreenSwitch(): void {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    const windowModeSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_win_win.png`);
    const windowModeHoverSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_win_win.png`);

    const fullscreenSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_win_full.png`);
    const fullscreenHoverSprite = Sprite.from(`${assetPrefix}/options/op_${locale}_win_full.png`);

    const windowModeButton = new FancyButton({
      defaultView: windowModeSprite,
      hoverView: windowModeHoverSprite
    });
    windowModeButton.x = 60;
    windowModeButton.y = 180;

    windowModeButton.onDown.connect(() => {
      this._clickSound.play();

      if (document.fullscreenElement) {
        this._updateWindowButtonState(false);
        document.exitFullscreen();
      }

      client.isFullScreenEnabled = false;
      this._onPlayerOptionsChanged();
    });

    const fullscreenButton = new FancyButton({
      defaultView: fullscreenSprite,
      hoverView: fullscreenHoverSprite
    });
    fullscreenButton.x = 120;
    fullscreenButton.y = 213;

    fullscreenButton.onDown.connect(() => {
      this._clickSound.play();

      if (!document.fullscreenElement) {
        this._updateWindowButtonState(true);
        document.body.requestFullscreen();
      }

      client.isFullScreenEnabled = true;
      this._onPlayerOptionsChanged();
    });

    this._windowModeButton = windowModeButton;
    this._fullscreenButton = fullscreenButton;

    this._updateWindowButtonState(!!document.fullscreenElement);

    this.addChild(windowModeButton, fullscreenButton);
  }

  private _updateWindowButtonState(isFullscreen: boolean): void {
    let activeButton, inactiveButton: FancyButton;
    if (isFullscreen) {
      activeButton = this._fullscreenButton;
      inactiveButton = this._windowModeButton;
    } else {
      activeButton = this._windowModeButton;
      inactiveButton = this._fullscreenButton;
    }

    activeButton.defaultView.alpha = 1;
    activeButton.hoverView.alpha = 1;
    inactiveButton.defaultView.alpha = 0;
    inactiveButton.hoverView.alpha = 0.6;
  }

  private _drawForbiddenCardsControl(): void {
    const assetPrefix = client.gameMode;

    const tickSprite = Sprite.from(`${assetPrefix}/options/op_limited.png`);
    const tickHoverSprite = Sprite.from(`${assetPrefix}/options/op_limited.png`);

    const button = new FancyButton({
      defaultView: tickSprite,
      hoverView: tickHoverSprite
    });

    button.x = 518;
    button.y = 215;

    button.onDown.connect(() => {
      this._clickSound.play();
      this._toggleForbiddenCardState(button, !client.isForbiddenCardsEnabled);
      client.isForbiddenCardsEnabled = !client.isForbiddenCardsEnabled;

      this._onPlayerOptionsChanged();
    });

    this._toggleForbiddenCardState(button, client.isForbiddenCardsEnabled);
    this.addChild(button);
  }

  _toggleForbiddenCardState(button: FancyButton, isForbiddenCardsDisabled: boolean): void {
    if (isForbiddenCardsDisabled) {
      button.defaultView.alpha = 1;
      button.hoverView.alpha = 1;
    } else {
      button.defaultView.alpha = 0;
      button.hoverView.alpha = 0.6;
    }
  }
}

export default OptionsPage;