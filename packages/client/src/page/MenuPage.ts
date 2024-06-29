import { FancyButton } from '@pixi/ui';
import { AnimatedSprite, Assets, Container, FederatedPointerEvent, Sprite, Spritesheet } from 'pixi.js';
import { BasePage } from './BasePage';
import { Sound } from '@pixi/sound';
import { getNavigator } from '../navigation';
import op from './OptionsPage';
import CardListPage from './CardListPage';
import { CircleOpenFilter } from '../filter/CircleOpenFilter';
import SplashPage from './SplashPage';
import { FadeColorFilter } from '../filter/FadeColorFilter';
import { getGameMode } from '../util/application-helper';
import { getCurrentLocale } from '../i18n';
import DeckConstruction from './DeckConstruction';

let OptionsPage = op;

interface CustomFancyButton extends FancyButton {
    hoverViewTemp: Container;
}

class MenuPage extends BasePage {
  private _logoSprite: Sprite;
  private _shinyEffectSprite: Sprite;
  private _buttonContainer: Container;
  private _clickSound: Sound;
  private _returnSound: Sound;
  private _track: Sound;

  async preload(): Promise<void> {
    const assetPrefix = getGameMode();
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
    const assetPrefix = getGameMode();
    const locale = getCurrentLocale();

    const background = Sprite.from(`${assetPrefix}/menu/title_1_${locale}.png`);

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

    this._clickSound = Sound.from('commons/decide.ogg');
    this._returnSound = Sound.from('commons/return.ogg');
    this._track = Sound.from(`${assetPrefix}/menu/m_menu.ogg`);
    this._track.loop = true;

    logoContent.addChild(this._logoSprite, this._shinyEffectSprite, shinyEffectMask);

    this.addChild(background, logoContent);

    await this._renderMenuItems();
  }

  private _getDefaultButtonSpritesheets(): Spritesheet[] {
    const assetPrefix = getGameMode();
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
    const assetPrefix = getGameMode();
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
    const hoverSpritesCallback = (sheet: Spritesheet, index: number) => sheet.textures[`button${index + 1}-${i}.png`];

    let i: number;

    this._buttonContainer = new Container();
    this._buttonContainer.x = 201;
    this._buttonContainer.y = 320;
    this._buttonContainer.alpha = 0;

    for (i = 1; i <= 5; i++) {
      const defaultTexture = defaultsheets[0].textures[`button0-${i}.png`];

      const defaultAnimatedSprite: AnimatedSprite = new AnimatedSprite([
        defaultTexture,
        defaultsheets[1].textures[`button5-${i}.png`],
        defaultsheets[2].textures[`button6-${i}.png`],
        defaultsheets[3].textures[`button5-${i}.png`],
        defaultsheets[4].textures[`button6-${i}.png`],
      ]);
      defaultAnimatedSprite.loop = false;
      defaultAnimatedSprite.animationSpeed = 0.15;

      const hoverAnimatedSprite: AnimatedSprite = new AnimatedSprite(hoversheets.map(hoverSpritesCallback));
      hoverAnimatedSprite.loop = true;
      hoverAnimatedSprite.animationSpeed = 0.07;

      const button: CustomFancyButton = new FancyButton({
        defaultView: defaultAnimatedSprite,
        hoverView: hoverAnimatedSprite
      }) as CustomFancyButton;
      button.y = defaultTexture.frame.y;

      this._buttonContainer.addChild(button);
    }

    this.addChild(this._buttonContainer);
  }

  private _attachButtonListeners(): void {
    if (!this._buttonContainer.children.length) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const page = this;
    let isInteracting: boolean = false;

    const onButtonSpriteComplete = (button: CustomFancyButton) => {
      const defaultView: AnimatedSprite = <AnimatedSprite>button.defaultView;

      defaultView.currentFrame = 0;
      button.hoverView = button.hoverViewTemp;
      delete button.hoverViewTemp;
      isInteracting = false;
    }

    const onButtonPointerDownCallback = function (this: CustomFancyButton, event: FederatedPointerEvent) {
      if (isInteracting || event.button > 0) {
        return;
      }

      isInteracting = true;

      if (this.defaultView instanceof AnimatedSprite) {
        this.hoverViewTemp = this.hoverView;
        this.hoverView = null;
        this.defaultView.gotoAndPlay(1);
      }

      page._clickSound.play();
    };

    const onButtonPointerEnterCallback = function (this: CustomFancyButton) {
      const hoverSprite = (this.hoverView || this.hoverViewTemp) as AnimatedSprite;
      if (hoverSprite) {
        hoverSprite.play();
      }
    };

    const onButtonPointerLeaveCallback = function (this: CustomFancyButton) {
      const hoverSprite = (this.hoverView || this.hoverViewTemp) as AnimatedSprite;
      if (hoverSprite) {
        hoverSprite.stop();
      }
    };

    const button1: CustomFancyButton = <CustomFancyButton>this._buttonContainer.children[0];
    (button1.defaultView as AnimatedSprite).onComplete = () => {
      onButtonSpriteComplete(button1);
    };

    const button2: CustomFancyButton = <CustomFancyButton>this._buttonContainer.children[1];
    (button2.defaultView as AnimatedSprite).onComplete = () => {
      onButtonSpriteComplete(button2);
      this._onDeckConstructionButtonClicked();
    };

    const button3: CustomFancyButton = <CustomFancyButton>this._buttonContainer.children[2];
    (button3.defaultView as AnimatedSprite).onComplete = () => {
      onButtonSpriteComplete(button3);
      this._onCardListButtonClicked();
    };

    const button4: CustomFancyButton = <CustomFancyButton>this._buttonContainer.children[3];
    (button4.defaultView as AnimatedSprite).onComplete = () => {
      onButtonSpriteComplete(button4);
      this._onOptionsButtonClicked();
    };

    const button5: CustomFancyButton = <CustomFancyButton>this._buttonContainer.children[4];
    (button5.defaultView as AnimatedSprite).onComplete = () => {
      onButtonSpriteComplete(button5);
      this._onQuitButtonClicked();
    };

    for (const button of this._buttonContainer.children) {
      button.onmousedown = onButtonPointerDownCallback;
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
    await getNavigator().navigate({
      createPage: () => new SplashPage(),
      transition: {
        filter: new FadeColorFilter(),
        duration: 2000
      }
    });
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

  private async _playAudio(): Promise<void> {
    await this._track.play();
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof MenuPage) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });

  import.meta.hot.accept('./OptionsPage', async (newModule: any) => {
    if (newModule) {
      if (getNavigator().currentModal instanceof OptionsPage) {
        await getNavigator().replaceModal({
          createPage: () => new newModule.default()
        });
      }
      OptionsPage = newModule.default;
    }
  });
}

export default MenuPage;