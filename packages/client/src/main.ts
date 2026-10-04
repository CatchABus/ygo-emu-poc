import { client } from './client';
import { initAssets } from './handler/assetManager';
import { addSuspendListener } from './handler/resumeSuspend';
import { initI18n } from './i18n';
import { getNavigator, setupNavigator } from './navigation';
import LoginPage from './page/LoginPage';
import './styles/main.scss';
import { setCursorImage } from './util/helpers';

// For HMR purposes
if (!client.isApplicationStarted()) {
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
  // Also, wait for the Renderer to be available
  const app = await client.start({
    // Light color is better for making sprites more distinct and positioning easier
    background: '#fff',
    resizeTo: appElement
  });

  app.stage.scale = 2;

  await initAssets();
  await initI18n();

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  appElement.appendChild(app.canvas);

  const navigator = await setupNavigator(app, LoginPage);

  addSuspendListener();

  setCursorImage('default', '/commons/cursor00.png');
  setCursorImage('pointer', '/commons/cursor01.png');

  app.renderer.on('resize', (width, height) => {
    if (navigator.currentPage) {
      navigator.currentPage.resize(width, height);

      // Page scale is the scale factor between the window size and the background image size
      navigator.modalContainer.scale.copyFrom(navigator.currentPage.scale);
    }
  });

  if (import.meta.env.DEV) {
    globalThis.__PIXI_APP__ = app;
    globalThis.__onLiveSync = (newModule) => {
      const currentPage = getNavigator().currentPage;
      const newPage = newModule.default && currentPage.constructor.name === newModule.default.name ? new newModule.default() : currentPage;

      getNavigator().navigate({
        createPage: () => newPage
      });
    }
  }
}