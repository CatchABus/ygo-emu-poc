import { Application } from 'pixi.js';
import { initI18n } from './i18n';
import { initAssets } from './manager/assetManager';
import { setupNavigator } from './navigation';
import SplashPage from './page/SplashPage';
import './styles/main.scss';
import { isApplicationStarted, setApplication } from './util/application-helper';
import { initCursor } from './util/cursor';

// For HMR purposes
if (!isApplicationStarted()) {
  startApp();
}

async function startApp() {
  const appElement = document.getElementById('app');
  if (!appElement) {
    throw new Error('Cannot find application DOM element \'#app\'');
  }

  // The application will create a renderer using WebGL, if possible,
  // with a fallback to a canvas render. It will also setup the ticker
  // and the root stage PIXI.Container
  const app = new Application();

  // Wait for the Renderer to be available
  await app.init({
    // Light color is better for making sprites more distinct and positioning easier
    background: '#fff',
    resizeTo: appElement,
  });

  setApplication(app);

  await initAssets();
  await initI18n();

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  appElement.appendChild(app.canvas);

  const navigator = await setupNavigator(app, SplashPage);

  initCursor(app);

  app.renderer.on('resize', (width, height) => {
    if (navigator.currentPage) {
      navigator.currentPage.resize(width, height);

      // Page scale is the scale factor between the window size and the background image size
      navigator.modalContainer.scale.copyFrom(navigator.currentPage.scale);
    }
  });

  if (import.meta.env.DEV) {
    globalThis.__PIXI_APP__ = app;
  }
}