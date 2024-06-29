import { Sound, sound } from '@pixi/sound';
import { FancyButton, Slider } from '@pixi/ui';
import { Assets, Graphics, Sprite } from 'pixi.js';
import { HoverButtonContainer } from '../components/HoverButtonView';
import { getCurrentLocale } from '../i18n';
import storage from '../storage';
import { getGameMode } from '../util/application-helper';
import { BasePage } from './BasePage';
import { SliderControls } from '../components/SliderControls';

class OptionsPage extends BasePage {
  private _windowModeButton: FancyButton;
  private _fullscreenButton: FancyButton;

  private readonly _clickSound: Sound;

  constructor() {
    super();
    this.alpha = 0;
    this._clickSound = Sound.from('commons/decide.ogg');
  }

  onNavigatingTo(): void | Promise<void> {
    const assetPrefix = getGameMode();
    const locale = getCurrentLocale();

    this.addChild(Sprite.from(`${assetPrefix}/options/joey_menu_op_${locale}.png`));

    this._drawVolumeBar();
    this._drawCardsetSwitch();
    this._drawWindowControls();
    this._drawForbiddenCardsControl();
  }

  onNavigatedTo(): void {
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
    const assetPrefix = getGameMode();
    await Assets.loadBundle(`${assetPrefix}/options`);
  }

  private _drawVolumeBar(): void {
    const assetPrefix = getGameMode();
    const container = new SliderControls();
    const volumeSpritesheet = Assets.get(`${assetPrefix}/options/op_sound.json`);
    const leftHoverSprite: Sprite = Sprite.from(volumeSpritesheet.textures['item-1.png']);
    const rightHoverSprite: Sprite = Sprite.from(volumeSpritesheet.textures['item-2.png']);

    container.x = 33;
    container.y = 105;

    const leftButton = new HoverButtonContainer(leftHoverSprite);

    const slider = this._createVolumeSlider();
    slider.x = 32;

    const rightButton = new HoverButtonContainer(rightHoverSprite);
    rightButton.x = 336;

    container.init({
      decreaseView: leftButton,
      slider,
      increaseView: rightButton
    });

    this.addChild(container);
  }

  private _createVolumeSlider(): Slider {
    const assetPrefix = getGameMode();
    const background = new Graphics().rect(0, 0, 292, 22).fill('transparent');
    const volumeSpritesheet = Assets.get(`${assetPrefix}/options/op_sound.json`);

    const slider = new Slider({
      bg: background,
      fill: new Graphics(),
      slider: new Sprite(volumeSpritesheet.textures['item-3.png']),
      min: 0,
      max: 100,
      value: 50,
    });
    slider.max = 1;
    slider.value = sound.volumeAll;

    slider.onUpdate.connect((value) => {
      sound.volumeAll = value;
      storage.setItem('volumeAll', value.toString());
    });

    return slider;
  }

  private _drawCardsetSwitch(): void {
    const assetPrefix = getGameMode();
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

  private _drawWindowControls(): void {
    this._drawFullscreenSwitch();
    this._drawWindowBitControl();
  }

  private _drawFullscreenSwitch(): void {
    const assetPrefix = getGameMode();
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
    });

    this._windowModeButton = windowModeButton;
    this._fullscreenButton = fullscreenButton;

    this._updateWindowButtonState(!!document.fullscreenElement);

    this.addChild(windowModeButton, fullscreenButton);
  }

  private _drawWindowBitControl(): void {
    const assetPrefix = getGameMode();
    const locale = getCurrentLocale();

    // This is the default
    const windowBit32Sprite = Sprite.from(`${assetPrefix}/options/op_${locale}_win_32.png`);
    windowBit32Sprite.x = 245;
    windowBit32Sprite.y = 235;

    this.addChild(windowBit32Sprite);
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
    const assetPrefix = getGameMode();

    const storedValue = storage.getItem('disableForbiddenCards');
    const tickSprite = Sprite.from(`${assetPrefix}/options/op_limited.png`);
    const tickHoverSprite = Sprite.from(`${assetPrefix}/options/op_limited.png`);

    const button = new FancyButton({
      defaultView: tickSprite,
      hoverView: tickHoverSprite
    });

    let isForbiddenCardsDisabled = storedValue === 'true';

    button.x = 518;
    button.y = 215;

    button.onDown.connect(() => {
      isForbiddenCardsDisabled = !isForbiddenCardsDisabled;
      this._clickSound.play();
      this._toggleForbiddenCardState(button, isForbiddenCardsDisabled);
    });

    this._toggleForbiddenCardState(button, isForbiddenCardsDisabled);
    this.addChild(button);
  }

  _toggleForbiddenCardState(button: FancyButton, isForbiddenCardsDisabled: boolean): void {
    if (isForbiddenCardsDisabled) {
      button.defaultView.alpha = 1;
      button.hoverView.alpha = 1;
      storage.setItem('disableForbiddenCards', 'true');
    } else {
      button.defaultView.alpha = 0;
      button.hoverView.alpha = 0.6;
      storage.setItem('disableForbiddenCards', 'false');
    }
  }
}

export default OptionsPage;