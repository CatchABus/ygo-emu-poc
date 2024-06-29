import { Sound } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { Assets, Container, Graphics, Sprite } from 'pixi.js';
import { getNavigator } from '../navigation';
import { getGameMode } from '../util/application-helper';
import { BasePage } from './BasePage';
import { getCurrentLocale } from '../i18n';
import MenuPage from './MenuPage';
import { CrossHatchFilter } from '../filter/CrossHatchFilter';

class DeckConstruction extends BasePage {
  private _backButton: FancyButton;

  private _bagContainer: Container;
  private _bagButton: FancyButton;
  private _bagFilters: Container;

  private _clickSound: Sound;
  private _bagOpenSound: Sound;
  private _track: Sound;

  private _isBagOpen: boolean = false;

  async preload(): Promise<void> {
    const assetPrefix = getGameMode();
    await Assets.loadBundle(`${assetPrefix}/deck_c`);
  }

  async onNavigatedTo(): Promise<void> {
    this._addEscapeKeyListener();
    this._playAudio();
    this._attachInteractionListeners();
  }

  async onNavigatingTo(): Promise<void> {
    await this._init();
  }

  async onNavigatingFrom(): Promise<void> {
    this.stopAllAnimations();

    this._track.stop();
    this._track.destroy();
  }

  onNavigatedFrom(): void {
  }

  private async _init(): Promise<void> {
    const assetPrefix = getGameMode();

    this._drawBackground();
    this._drawBackButton();
    this._drawBag();
    this._drawBagScrollbar();

    this._clickSound = Sound.from('commons/decide.ogg');
    this._bagOpenSound = Sound.from('commons/card_open.ogg');
    this._track = Sound.from(`${assetPrefix}/deck_c/m_deck.ogg`);
    this._track.loop = true;
  }

  private async _playAudio(): Promise<void> {
    await this._track.play();
  }

  private _drawBackground(): void {
    const assetPrefix = getGameMode();

    const bgLeft = Sprite.from(`${assetPrefix}/deck_c/background/background_l_${getCurrentLocale()}.png`);

    const bgCenter = Sprite.from(`${assetPrefix}/deck_c/background/background_c.png`);
    bgCenter.x = 217;

    const bagAbove = Sprite.from(`${assetPrefix}/deck_c/background/above.png`);
    bagAbove.x = 583;
  
    const bagBelow = Sprite.from(`${assetPrefix}/deck_c/background/down.png`);
    bagBelow.position.set(583, 597);

    this.addChild(bgLeft, bgCenter, bagAbove, bagBelow);
  }

  private _drawBackButton(): void {
    const assetPrefix = getGameMode();
    const locale = getCurrentLocale();

    const defaultView = Sprite.from(`${assetPrefix}/deck_c/background/back_1_${locale}.png`);
    defaultView.alpha = 0;

    const backButton = new FancyButton({
      defaultView,
      hoverView: `${assetPrefix}/deck_c/background/back_1_${locale}.png`,
      pressedView: `${assetPrefix}/deck_c/background/back_2_${locale}.png`
    });
    backButton.position.set(61, 548);

    this.addChild(backButton);
    this._backButton = backButton;
  }

  private _drawBag(): void {
    const assetPrefix = getGameMode();

    const container = new Container();
    container.x = 580;

    const bagMask = new Graphics().rect(580, 0, 192, 600).fill('red');
    container.mask = bagMask;
  
    const bag = Sprite.from(`${assetPrefix}/deck_c/background/bag.png`);
    bag.x = 99;

    const bagToggleButton = this._createBagButton();
    bagToggleButton.position.set(107, 8);

    const bagFilters = this._createBagFilters();
    bagFilters.x = 139;
    bagFilters.y = -39;

    container.addChild(bag, bagToggleButton, bagFilters);
    this.addChild(container, bagMask);

    this._bagContainer = container;
    this._bagButton = bagToggleButton;
    this._bagFilters = bagFilters;
  }

  private _createBagButton(): FancyButton {
    const assetPrefix = getGameMode();

    const defaultView = Sprite.from(`${assetPrefix}/deck_c/background/arrow_1.png`);
    defaultView.alpha = 0;

    const bagToggleButton = new FancyButton({
      defaultView,
      hoverView: `${assetPrefix}/deck_c/background/arrow_1.png`,
      pressedView: `${assetPrefix}/deck_c/background/arrow_2.png`
    });

    return bagToggleButton;
  }

  private _createBagFilters(): Container {
    const assetPrefix = getGameMode();

    const container = new Container();
    const filterBg = Sprite.from(`${assetPrefix}/deck_c/background/filter_mini.png`);

    container.addChild(filterBg);

    return container;
  }

  private _drawBagScrollbar(): void {
    const assetPrefix = getGameMode();
    
    const container = new Container();
    container.x = 767;

    const scrollbar = Sprite.from(`${assetPrefix}/deck_c/background/right.png`);

    container.addChild(scrollbar);
    this.addChild(container);
  }

  private async _goBack(): Promise<void> {
    await getNavigator().navigate({
      createPage: () => new MenuPage(),
      transition: {
        filter: new CrossHatchFilter(),
        duration: 1500
      }
    });
  }

  private _attachInteractionListeners(): void {
    let isOpeningBag = false;

    this._backButton.onclick = async () => {
      await this._clickSound.play();
      await this._goBack();
    };

    this._bagButton.onclick = async () => {
      if (isOpeningBag) {
        return;
      }

      isOpeningBag = true;

      await this._bagOpenSound.play();

      if (this._isBagOpen) {
        await this._showBagFilters(true);
      }
      
      this.animate({
        from: this._bagContainer.x,
        to: this._isBagOpen ? 580 : 481,
        duration: 300,
        onUpdate: (value: number) => {
          this._bagContainer.x = value;
        },
        onComplete: async () => {
          if (!this._isBagOpen) {
            await this._showBagFilters(false);
          }

          this._isBagOpen = !this._isBagOpen;
          isOpeningBag = false;
        }
      });
    };
  }

  private _showBagFilters(isBagOpen: boolean): Promise<void> {
    let from, to;

    if (isBagOpen) {
      from = 0;
      to = -this._bagFilters.height;
    } else {
      from = -this._bagFilters.height;
      to = 0;
    }

    const animation = this.animate({
      from,
      to,
      duration: 200,
      onUpdate: (value: number) => {
        this._bagFilters.y = value;
      }
    });

    return animation.finished;
  }

  private _addEscapeKeyListener(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        this._goBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof DeckConstruction) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });
}

export default DeckConstruction;