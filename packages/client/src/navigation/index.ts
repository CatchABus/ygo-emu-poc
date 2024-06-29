import { Application, ColorSource, Container, Filter, Graphics, Sprite } from 'pixi.js';
import { BasePage } from '../page/BasePage';
import { animate } from '../animation';

type PageConstructor = new () => BasePage;

interface TransitionOptions {
    filter: Filter;
    duration: number;
}

interface NavigationOptions {
    createPage: () => BasePage;
    transition?: TransitionOptions;
}

interface ModalOptions {
    createPage: () => BasePage;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    backdropColor?: ColorSource;
    closeOnClickOutside?: boolean;
    onClose?: () => void;
}

let _navigator: Navigator = null;

class Navigator {
  private _currentPage: BasePage = null;
  private _currentModal: BasePage = null;
  private _currentModalOptions: ModalOptions = null;

  private _isNavigating: boolean = false;

  private readonly _app: Application;
  private readonly _modalContainer: Container;
  private readonly _navigationQueue: Array<() => Promise<void>>;

  constructor(app: Application) {
    this._app = app;
    this._navigationQueue = [];
    this._modalContainer = new Container();
    this._modalContainer.zIndex = 800;

    app.stage.addChild(this._modalContainer);
  }

  get currentPage(): BasePage {
    return this._currentPage;
  }

  get currentModal(): BasePage {
    return this._currentModal;
  }

  get modalContainer(): Container {
    return this._modalContainer;
  }

  private _getScreenSprite(page: BasePage): Sprite {
    const { stage } = this._app;
    const childrenToExclude = stage.children.filter(child => child !== page);

    for (const child of childrenToExclude) {
      child.visible = false;
    }

    const texture = this._app.renderer.extract.texture(stage);

    for (const child of childrenToExclude) {
      child.visible = true;
    }

    return Sprite.from(texture);
  }

  private _startPageTransition(view: Container, transitionOptions: TransitionOptions): Promise<void> {
    const { duration, filter } = transitionOptions;

    view.filters = [filter];

    return new Promise((resolve) => {
      animate({
        from: 0,
        to: 1,
        duration,
        onUpdate: (value: number) => {
          filter.resources.uniformWrapper.uniforms.progress = value;
        },
        onComplete: resolve
      })
    });
  }

  async navigate(options: NavigationOptions): Promise<void> {
    if (this._isNavigating) {
      this._navigationQueue.push(() => this.navigate(options));
      return;
    }

    this._isNavigating = true;
        
    const { width, height } = this._app.renderer;
    let bitmapToAnimate: Container = null;

    options = {
      ...this._getPageDefaultOptions(),
      ...options
    };

    if (this._currentPage) {
      const oldPage = this._currentPage;

      // Unset early to prevent issues from multiple navigate calls
      this._currentPage = null;

      if (options.transition.filter) {
        bitmapToAnimate = this._getScreenSprite(oldPage);
        this._app.stage.addChild(bitmapToAnimate);
      }

      await oldPage.onNavigatingFrom();

      this._app.stage.removeChild(oldPage);
      oldPage.destroy({
        children: true
      });

      await oldPage.onNavigatedFrom();
    }

    this._currentPage = options.createPage();

    if (this._currentPage) {
      await this._currentPage.preload();
      await this._currentPage.onNavigatingTo();

      // This will scale entire page based on background bounds
      this._currentPage.setSize(width, height);

      this._app.stage.addChild(this._currentPage);

      if (bitmapToAnimate) {
        this._app.stage.swapChildren(bitmapToAnimate, this._currentPage);
        await this._startPageTransition(bitmapToAnimate, options.transition);
        this._app.stage.removeChild(bitmapToAnimate);
      }

      await this._currentPage.onNavigatedTo();
    }

    this._isNavigating = false;

    if (this._navigationQueue.length) {
      const navigationCall = this._navigationQueue.shift();
      navigationCall();
    }
  }

  async replaceModal(options: NavigationOptions): Promise<void> {
    await this.showModal({
      ...this._currentModalOptions,
      ...options
    });
  }

  async showModal(options: ModalOptions): Promise<void> {
    // Close old modal if any
    await this.closeModal();

    this._currentModal = options.createPage();

    if (this._currentModal) {
      this._currentModalOptions = options;

      options = {
        ...this._getModalDefaultOptions(),
        ...options
      };

      await this._currentModal.preload();
      await this._currentModal.onNavigatingTo();

      if (options.width && options.height) {
        this._currentModal.setSize(options.width, options.height);
      }

      if (options.backdropColor || options.closeOnClickOutside) {
        this._addModalBackdrop(options);
      }

      this._modalContainer.addChild(this._currentModal);
      await this._currentModal.onNavigatedTo();

      this._currentModal.position.set(options.x, options.y);
    }
  }

  async closeModal(): Promise<void> {
    if (this._currentModal) {
      const modal = this._currentModal;
      const options = this._currentModalOptions;

      // Unset early to prevent issues from multiple closeModal calls
      this._currentModal = null;
      this._currentModalOptions = null;

      if (options.onClose) {
        options.onClose();
      }

      await modal.onNavigatingFrom();
      this._modalContainer.removeChildren();
      await modal.onNavigatedFrom();

      modal.destroy({
        children: true
      });
    }
  }

  private _addModalBackdrop(options: ModalOptions) {
    const { width, height } = this._app.renderer;
    const graphic = new Graphics();
    graphic.eventMode = 'static';

    this._modalContainer.addChild(graphic);

    graphic.rect(0, 0, width, height);
    graphic.fill(options.backdropColor ?? 'transparent');

    if (options.closeOnClickOutside) {
      graphic.once('click', () => {
        graphic.eventMode = 'none';
        this.closeModal();
      });
    }
  }

  private _getPageDefaultOptions(): NavigationOptions {
    return {
      createPage: () => null,
      transition: {
        duration: 300,
        filter: null
      }
    };
  }

  private _getModalDefaultOptions(): ModalOptions {
    const { width, height } = this._app.renderer;
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      createPage: () => null,
      x: centerX / 2,
      y: centerY / 2
    };
  }
}

async function setupNavigator(app: Application, defaultPage: PageConstructor): Promise<Navigator> {
  if (_navigator) {
    throw new Error('Navigator is already initialized');
  }

  if (!defaultPage) {
    throw new Error(`Cannot initialize navigator without a default page: ${defaultPage}`);
  }

  _navigator = new Navigator(app);
  await _navigator.navigate({
    createPage: () => new defaultPage()
  });
  _navigator.modalContainer.scale.copyFrom(_navigator.currentPage.scale);

  return _navigator;
}

function getNavigator(): Navigator {
  if (!_navigator) {
    throw new Error('Navigator is not initialized');
  }

  return _navigator;
}



export {
  setupNavigator,
  Navigator,
  getNavigator
};