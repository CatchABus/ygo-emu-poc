import { initI18n } from './i18n';
import { initAssets } from './handler/assetManager';
import { addSuspendListener } from './handler/resumeSuspend';
import { setupNavigator } from './navigation';
import './styles/main.scss';
import { initCursor } from './util/cursor';
import LoginPage from './page/LoginPage';
import { client } from './client';

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
    resizeTo: appElement,
  });

  await initAssets();
  await initI18n();

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  appElement.appendChild(app.canvas);

  const navigator = await setupNavigator(app, LoginPage);

  initCursor(app);

  addSuspendListener();

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