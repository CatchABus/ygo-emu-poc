import { ButtonContainer } from '@pixi/ui';
import { Howl } from 'howler';
import { Assets, Sprite } from 'pixi.js';
import { FadeColorFilter } from '../filter/FadeColorFilter';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import storage from '../storage';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';
import { client } from '../client';

class SplashPage extends BasePage {
  private _background: ButtonContainer;
  private _clickSound: Howl;

  async preload(): Promise<void> {
    const assetPrefix = client.gameMode;
    await Assets.loadBundle(`${assetPrefix}/splash`);
  }

  onNavigatingFrom(): void {
    this.stopAllAnimations();
  }

  onNavigatedFrom(): void {
  }

  async onNavigatedTo(): Promise<void> {
    this._background.onpointerdown = (event) => {
      if (event.button <= 0) {
        this._background.eventMode = 'none';

        storage.loadSettings();

        this._clickSound.play();
        getNavigator().navigate({
          createPage: () => new MenuPage(),
          transition: {
            filter: new FadeColorFilter(),
            duration: 2000
          }
        });
      }
    };
  }

  async onNavigatingTo(): Promise<void> {
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();

    this._background = new ButtonContainer(Sprite.from(`${assetPrefix}/splash/trial01${locale}.png`));
    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });

    this.addChild(this._background);
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof SplashPage) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });
}

export default SplashPage;