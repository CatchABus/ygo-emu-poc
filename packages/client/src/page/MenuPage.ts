import { FancyButton } from '@pixi/ui';
import { Howl } from 'howler';
import * as log from 'loglevel';
import { AnimatedSprite, Assets, Container, FederatedPointerEvent, Graphics, Sprite, Spritesheet } from 'pixi.js';
import { client } from '../client';
import { CircleOpenFilter } from '../filter/CircleOpenFilter';
import { FadeColorFilter } from '../filter/FadeColorFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { getRequestProtocol } from '../util/helpers';
import { BasePage } from './BasePage';
import CardListPage from './CardListPage';
import DeckConstruction from './DeckConstruction';
import LoginPage from './LoginPage';
import OptionsPage from './OptionsPage';

class MenuPage extends BasePage {
  private _logoSprite: Sprite;
  private _shinyEffectSprite: Sprite;
  private _buttonContainer: Container;
  private _btnAnimContainer: Container;
  private _clickSound: Howl;
  private _returnSound: Howl;
  private _track: Howl;

  private readonly _buttonCallbacks;

  constructor() {
    super();

    this._buttonCallbacks = [
      () => {},
      async () => await this._onDeckConstructionButtonClicked(),
      async () => await this._onCardListButtonClicked(),
      async () => await this._onOptionsButtonClicked(),
      async () => await this._onQuitButtonClicked()
    ];
  }

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    await Assets.loadBundle(`${assetPrefix}/menu`);
  }

  async onNavigatingTo(): Promise<void> {
    await this._init();
  }

  async onNavigatedTo(): Promise<void> {
    await this._playAudio();
    this._runAllAnimations().then(() => this._attachButtonListeners());
  }

  async onNavigatingFrom(): Promise<void> {
    this.stopAllAnimations();

    await getNavigator().closeModal();

    this._track.stop();
  }

  onNavigatedFrom(): void | Promise<void> {
  }

  private async _init(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    const background = Sprite.from(`${assetPrefix}/menu/title_1_${locale}.png`);
    const logoBoundsMask = new Graphics();

    const logoContent = new Container();
    logoContent.x = 120;
    logoContent.y = 10;

    const shinyEffectMask = Sprite.from(`${assetPrefix}/menu/joey_logo.png`);

    this._logoSprite = Sprite.from(`${assetPrefix}/menu/joey_logo.png`);
    this._logoSprite.alpha = 0;

    this._shinyEffectSprite = Sprite.from(`${assetPrefix}/menu/glossy0.png`);

    this._shinyEffectSprite.x = 560 + this._shinyEffectSprite.width;
    this._shinyEffectSprite.anchor.set(1, 0);
    this._shinyEffectSprite.mask = shinyEffectMask;

    logoBoundsMask.rect(0, 0, this._logoSprite.width, this._logoSprite.height);
    logoBoundsMask.fill();

    logoContent.mask = logoBoundsMask;

    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this._returnSound = new Howl({
      src: 'commons/return.ogg'
    });
    this._track = new Howl({
      src: `${assetPrefix}/menu/m_menu.ogg`,
      loop: true
    });

    logoContent.addChild(this._logoSprite, this._shinyEffectSprite, shinyEffectMask, logoBoundsMask);

    this.addChild(background, logoContent);

    await this._renderMenuItems();
  }

  private _getDefaultButtonSpritesheets(): Spritesheet[] {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();
    const defaultsheets: Spritesheet[] = [];

    const sheet1: Spritesheet = Assets.get(`${assetPrefix}/menu/menu_${locale}_ani0.json`);
    const sheet2 = Assets.get(`${assetPrefix}/menu/menu_${locale}_ani5.json`);
    const sheet3 = Assets.get(`${assetPrefix}/menu/menu_${locale}_ani6.json`);

    defaultsheets.push(sheet1);

    for (let i = 0; i < 3; i++) {
      defaultsheets.push(sheet2, sheet3);
    }

    return defaultsheets;
  }

  private _getHoverButtonSpritesheets(): Spritesheet[] {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();
    const hoversheets: Spritesheet[] = [];

    for (let i = 1; i <= 4; i++) {
      const sheet = Assets.get(`${assetPrefix}/menu/menu_${locale}_ani${i}.json`);
      hoversheets.push(sheet);
    }

    return hoversheets;
  }

  private async _renderMenuItems(): Promise<void> {
    const defaultsheets = this._getDefaultButtonSpritesheets();
    const hoversheets = this._getHoverButtonSpritesheets();
    const buttonCount = this._buttonCallbacks.length;
    const hoverSpritesCallback = (sheet: Spritesheet, index: number) => sheet.textures[`button${index + 1}-${i}.png`];
    const containerX = 201;
    const containerY = 320;

    let i: number;

    this._buttonContainer = new Container();
    this._buttonContainer.position.set(containerX, containerY);
    this._buttonContainer.alpha = 0;

    this._btnAnimContainer = new Container();
    this._btnAnimContainer.position.set(containerX, containerY);

    for (i = 1; i <= buttonCount; i++) {
      const defaultSprite = Sprite.from(defaultsheets[0].textures[`button0-${i}.png`]);
      const buttonY = defaultSprite.texture.frame.y;

      const pressedAnimSprite: AnimatedSprite = new AnimatedSprite([
        defaultsheets[1].textures[`button5-${i}.png`],
        defaultsheets[2].textures[`button6-${i}.png`],
        defaultsheets[3].textures[`button5-${i}.png`],
        defaultsheets[4].textures[`button6-${i}.png`],
      ]);
      pressedAnimSprite.loop = false;
      pressedAnimSprite.animationSpeed = 0.15;
      pressedAnimSprite.visible = false;
      pressedAnimSprite.eventMode = 'none';

      const hoverAnimatedSprite: AnimatedSprite = new AnimatedSprite(hoversheets.map(hoverSpritesCallback));
      hoverAnimatedSprite.loop = true;
      hoverAnimatedSprite.animationSpeed = 0.07;

      const button = new FancyButton({
        defaultView: defaultSprite,
        hoverView: hoverAnimatedSprite
      });

      button.y = buttonY;
      pressedAnimSprite.y = buttonY;

      this._buttonContainer.addChild(button);
      this._btnAnimContainer.addChild(pressedAnimSprite);
    }

    this.addChild(this._buttonContainer, this._btnAnimContainer);
  }

  private _attachButtonListeners(): void {
    const buttons = this._buttonContainer.children as FancyButton[];

    if (!buttons.length) {
      return;
    }
    
    const btnAnimSprites = this._btnAnimContainer.children as AnimatedSprite[];
    let isInteracting: boolean = false;

    const onBtnPointerDownCallback = (event: FederatedPointerEvent, button: FancyButton, sprite: AnimatedSprite) => {
      if (isInteracting || event.button > 0) {
        return;
      }

      isInteracting = true;
      button.visible = false;
      sprite.visible = true;
      sprite.play();
      this._clickSound.play();
    };

    const onButtonPointerEnterCallback = function (this: FancyButton) {
      const hoverSprite = this.hoverView as AnimatedSprite;
      if (hoverSprite) {
        hoverSprite.play();
      }
    };

    const onButtonPointerLeaveCallback = function (this: FancyButton) {
      const hoverSprite = this.hoverView as AnimatedSprite;
      if (hoverSprite) {
        hoverSprite.stop();
      }
    };

    for (let i = 0, length = this._buttonCallbacks.length; i < length; i++) {
      const button = buttons[i];
      const btnAnimSprite = btnAnimSprites[i];

      btnAnimSprite.onComplete = () => {
        btnAnimSprite.currentFrame = 0;
        btnAnimSprite.visible = false;
        button.visible = true;
        isInteracting = false;
        this._buttonCallbacks[i]();
      };
      button.onmousedown = (event: FederatedPointerEvent) => onBtnPointerDownCallback(event, button, btnAnimSprite);
      button.onpointerenter = onButtonPointerEnterCallback;
      button.onpointerleave = onButtonPointerLeaveCallback;
    }
  }

  private async _onDeckConstructionButtonClicked(): Promise<void> {
    const filter = new CircleOpenFilter();
    filter.resources.uniformWrapper.uniforms.opening = 1;
    filter.resources.uniformWrapper.uniforms.scale = 2.0;
    filter.resources.uniformWrapper.uniforms.center = {
      x: 0,
      y: 0.5
    };

    await getNavigator().navigate({
      createPage: () => new DeckConstruction(),
      transition: {
        filter,
        duration: 1000
      }
    });
  }

  private async _onCardListButtonClicked(): Promise<void> {
    const filter = new CircleOpenFilter();
    filter.resources.uniformWrapper.uniforms.opening = 1;

    await getNavigator().navigate({
      createPage: () => new CardListPage(),
      transition: {
        filter,
        duration: 1000
      }
    });
  }

  private async _onOptionsButtonClicked(): Promise<void> {
    await getNavigator().showModal({
      createPage: () => new OptionsPage(),
      x: 40,
      y: 300,
      closeOnClickOutside: true,
      onClose: () => this._returnSound.play()
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        getNavigator().closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }

  private async _onQuitButtonClicked(): Promise<void> {
    try {
      client.isLogoutRequested = true;

      const response = await fetch(`${getRequestProtocol('http')}://${import.meta.env.YGO_HOST}/logout`, {
        method: 'POST',
        credentials: 'include',
        body: client.sessionId
      });

      if (response.status === 204) {
        await getNavigator().navigate({
          createPage: () => new LoginPage(),
          transition: {
            filter: new FadeColorFilter(),
            duration: 2000
          }
        });
      } else {
        client.isLogoutRequested = false;
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    }
  }

  private _runAllAnimations(): Promise<void> {
    return new Promise((resolve) => {
      this.animate({
        from: this._shinyEffectSprite.x,
        to: 0,
        duration: 1200,
        onUpdate: (value: number) => {
          this._shinyEffectSprite.x = value;
        }
      });

      this.animate({
        from: 0,
        to: 1,
        duration: 400,
        elapsed: -1200,
        onUpdate: (value: number) => {
          this._logoSprite.alpha = value;
        }
      });

      this.animate({
        from: 0,
        to: 1,
        duration: 700,
        elapsed: -1600,
        onUpdate: (value: number) => {
          this._buttonContainer.alpha = value;
        },
        onComplete: resolve
      });
    });
  }

  private _playAudio(): void {
    this._track.play();
  }
}

export default MenuPage;