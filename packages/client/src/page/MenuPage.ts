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
  private mLogoSprite: Sprite;
  private mShinyEffectSprite: Sprite;
  private mButtonContainer: Container;
  private mBtnAnimContainer: Container;
  private mClickSound: Howl;
  private mReturnSound: Howl;
  private mTrack: Howl;

  private readonly mButtonCallbacks: Array<() => void | Promise<void>>;

  constructor() {
    super();

    this.mButtonCallbacks = [
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

    this.mTrack.stop();
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

    this.mLogoSprite = Sprite.from(`${assetPrefix}/menu/joey_logo.png`);
    this.mLogoSprite.alpha = 0;

    this.mShinyEffectSprite = Sprite.from(`${assetPrefix}/menu/glossy0.png`);

    this.mShinyEffectSprite.x = 560 + this.mShinyEffectSprite.width;
    this.mShinyEffectSprite.anchor.set(1, 0);
    this.mShinyEffectSprite.mask = shinyEffectMask;

    logoBoundsMask.rect(0, 0, this.mLogoSprite.width, this.mLogoSprite.height);
    logoBoundsMask.fill();

    logoContent.mask = logoBoundsMask;

    this.mClickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this.mReturnSound = new Howl({
      src: 'commons/return.ogg'
    });
    this.mTrack = new Howl({
      src: `${assetPrefix}/menu/m_menu.ogg`,
      loop: true
    });

    logoContent.addChild(this.mLogoSprite, this.mShinyEffectSprite, shinyEffectMask, logoBoundsMask);

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
    const buttonCount = this.mButtonCallbacks.length;
    const hoverSpritesCallback = (sheet: Spritesheet, index: number) => sheet.textures[`button${index + 1}-${i}.png`];
    const containerX = 201;
    const containerY = 320;

    let i: number;

    this.mButtonContainer = new Container();
    this.mButtonContainer.position.set(containerX, containerY);
    this.mButtonContainer.alpha = 0;

    this.mBtnAnimContainer = new Container();
    this.mBtnAnimContainer.position.set(containerX, containerY);

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

      this.mButtonContainer.addChild(button);
      this.mBtnAnimContainer.addChild(pressedAnimSprite);
    }

    this.addChild(this.mButtonContainer, this.mBtnAnimContainer);
  }

  private _attachButtonListeners(): void {
    const buttons = this.mButtonContainer.children as FancyButton[];

    if (!buttons.length) {
      return;
    }
    
    const btnAnimSprites = this.mBtnAnimContainer.children as AnimatedSprite[];
    let isInteracting: boolean = false;

    const onBtnPointerDownCallback = (event: FederatedPointerEvent, button: FancyButton, sprite: AnimatedSprite) => {
      if (isInteracting || event.button > 0) {
        return;
      }

      isInteracting = true;
      button.visible = false;
      sprite.visible = true;
      sprite.play();
      this.mClickSound.play();
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

    for (let i = 0, length = this.mButtonCallbacks.length; i < length; i++) {
      const button = buttons[i];
      const btnAnimSprite = btnAnimSprites[i];

      btnAnimSprite.onComplete = () => {
        btnAnimSprite.currentFrame = 0;
        btnAnimSprite.visible = false;
        button.visible = true;
        isInteracting = false;
        this.mButtonCallbacks[i]();
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
      onClose: () => this.mReturnSound.play()
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
        from: this.mShinyEffectSprite.x,
        to: 0,
        duration: 1200,
        onUpdate: (value: number) => {
          this.mShinyEffectSprite.x = value;
        }
      });

      this.animate({
        from: 0,
        to: 1,
        duration: 400,
        elapsed: -1200,
        onUpdate: (value: number) => {
          this.mLogoSprite.alpha = value;
        }
      });

      this.animate({
        from: 0,
        to: 1,
        duration: 700,
        elapsed: -1600,
        onUpdate: (value: number) => {
          this.mButtonContainer.alpha = value;
        },
        onComplete: resolve
      });
    });
  }

  private _playAudio(): void {
    this.mTrack.play();
  }
}

export default MenuPage;