import { ColorSource, Container, Graphics } from 'pixi.js';
import { animate } from '../animation';
import { BasePage } from '../page/BasePage';
import { ITransitionFilter } from '../filter/ITransitionFilter';
import log from 'loglevel';
import { client } from '../client';

type PageConstructor = new () => BasePage;

interface TransitionOptions {
    filters: ITransitionFilter[];
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

  private readonly _modalContainer: Container;
  private readonly _navigationQueue: Array<() => Promise<void>>;

  constructor() {
    this._navigationQueue = [];
    this._modalContainer = new Container();
    this._modalContainer.zIndex = 800;

    client.getApplication().stage.addChild(this._modalContainer);
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

  private _startPageTransition(view: Container, transitionOptions: TransitionOptions): Promise<void> {
    const { duration, filters } = transitionOptions;

    view.filters = filters;

    return new Promise((resolve) => {
      animate({
        from: 0,
        to: 1,
        duration,
        onUpdate: (value: number) => {
          for (const f of filters) {
            f.progress = value;
          }
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

    const newPage = options.createPage();
    const oldPage = this._currentPage;

    if (newPage && newPage === oldPage) {
      log.error('Navigation failed. Cannot navigate to the same page twice!');
      return;
    }

    this._isNavigating = true;

    const app = client.getApplication();
    const { width, height } = app.renderer;

    options = {
      ...this._getPageDefaultOptions(),
      ...options
    };

    if (this._currentPage) {
      // Unset early to prevent issues from multiple navigate calls
      this._currentPage = null;

      await oldPage.onNavigatingFrom();
    }

    this._currentPage = newPage;

    if (newPage) {
      await newPage.preload();
      await newPage.onNavigatingTo();

      // This will scale entire page based on background bounds
      newPage.setSize(width, height);

      if (oldPage) {
        app.stage.addChildAt(newPage, app.stage.getChildIndex(oldPage));

        if (Array.isArray(options.transition?.filters) && options.transition.filters.length > 0) {
          await this._startPageTransition(oldPage, options.transition);
        }
      } else {
        app.stage.addChild(newPage);
      }
    }

    if (oldPage) {
      app.stage.removeChild(oldPage);
      oldPage.destroy({
        children: true
      });
      await oldPage.onNavigatedFrom();
    }

    if (newPage) {
      await newPage.onNavigatedTo();
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
    this._currentModal.eventMode = 'static';

    if (this._currentModal) {
      const { width, height } = client.getApplication().renderer;

      this._currentModalOptions = options;

      options = {
        ...this._getModalDefaultOptions(width, height),
        ...options
      };

      await this._currentModal.preload();
      await this._currentModal.onNavigatingTo();

      if (options.width && options.height) {
        this._currentModal.setSize(options.width, options.height);
      }

      if (options.backdropColor || options.closeOnClickOutside) {
        this._addModalBackdrop(width, height, options);
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

  private _addModalBackdrop(width: number, height: number, options: ModalOptions) {
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
        filters: null
      }
    };
  }

  private _getModalDefaultOptions(width: number, height: number): ModalOptions {
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      createPage: () => null,
      x: centerX / 2,
      y: centerY / 2
    };
  }
}

async function setupNavigator(defaultPage: PageConstructor): Promise<Navigator> {
  if (_navigator) {
    throw new Error('Navigator is already initialized');
  }

  if (!defaultPage) {
    throw new Error(`Cannot initialize navigator without a default page: ${defaultPage}`);
  }

  _navigator = new Navigator();
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
  getNavigator, Navigator, setupNavigator
};