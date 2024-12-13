import { Howl } from 'howler';
import { Assets, Container, FederatedPointerEvent, Graphics, Sprite, Text } from 'pixi.js';
import { FadeColorFilter } from '../filter/FadeColorFilter';
import { getNavigator } from '../navigation';
import storage from '../storage';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';
import { Button, FancyButton, Input } from '@pixi/ui';
import { AdjustmentFilter } from 'pixi-filters';
import i18next from 'i18next';
import { client } from '../client';
import * as log from 'loglevel';
import { createRect, getRequestProtocol } from '../util/helpers';

class LoginPage extends BasePage {
  private _background: Sprite;
  private _loginForm: Container;
  private _loginMessage: Text;
  private _clickSound: Howl;
  private _isLoggingIn: boolean;
  private _accountNameToReconnect: string;

  async preload(): Promise<void> {
    await Assets.loadBundle('login');
  }

  onNavigatingFrom(): void {
    this.stopAllAnimations();
  }

  onNavigatedFrom(): void {
  }

  async onNavigatedTo(): Promise<void> {
    await this._initAuthState();
  }

  async onNavigatingTo(): Promise<void> {
    this._background = Sprite.from('login/background.png');
    this._background.filters = [new AdjustmentFilter({
      brightness: 0.7
    })];
    this._clickSound = new Howl({
      src: 'commons/decide.ogg'
    });

    const formContent = this._createLoginForm();
    formContent.pivot.set(formContent.width / 2, formContent.height / 2);
    formContent.position.set(400, 300);
    formContent.alpha = 0;
    this._loginForm = formContent;

    const footer = this._createFooter();
    footer.position.set(0, 560);

    this.addChild(this._background, formContent, footer);
  }

  private _createLoginForm(): Container {
    const container = new Container();
    const formBg = new Graphics().roundRect(0, 0, 200, 180, 20).fill('rgba(0, 0, 0, 0.6)');
    const centerX = formBg.width / 2;

    const title = new Text({
      text: i18next.t('login.title'),
      style: {
        fill: '#fefefe',
        fontSize: 20
      }
    });
    title.anchor.set(0.5, 0.5);
    title.position.set(centerX, 24);

    container.addChild(formBg, title);

    return container;
  }

  private _renderLoginControls(onSubmit: (button: Button, event: FederatedPointerEvent) => void): void {
    const loginForm = this._loginForm;
    const container = new Container();
    container.position.y = 48;

    const accountName = new Input({
      bg: new Graphics().roundRect(0, 0, 160, 30, 5).fill('#fefefe'),
      placeholder: i18next.t('login.id'),
      textStyle: {
        fontSize: 16
      },
      padding: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8
      },
      addMask: true,
    });
    accountName.position.set((loginForm.width - accountName.width) / 2, 0);

    const password = new Input({
      bg: new Graphics().roundRect(0, 0, 160, 30, 5).fill('#fefefe'),
      placeholder: i18next.t('login.password'),
      secure: true,
      textStyle: {
        fontSize: 16
      },
      padding: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8
      },
      addMask: true,
    });
    password.position.set((loginForm.width - password.width) / 2, 40);

    const submitButton = this._createSubmitButton();
    submitButton.position.set((loginForm.width - submitButton.width) / 2, 92);
    submitButton.onUp.connect(onSubmit);

    container.addChild(accountName, password, submitButton);
    loginForm.addChild(container);
  }

  private _renderAccountUsedContent(onSubmit: (button: Button, event: FederatedPointerEvent) => void): void {
    const loginForm = this._loginForm;
    const container = new Container();
    container.position.y = 48;

    const message = new Text({
      text: i18next.t('login.account_already_in_use'),
      style: {
        align: 'center',
        fill: '#fefefe',
        fontSize: 14,
        wordWrap: true,
        wordWrapWidth: 180
      }
    });
    message.position.set((loginForm.width - message.width) / 2, 0);

    const submitButton = this._createSubmitButton();
    submitButton.position.set((loginForm.width - submitButton.width) / 2, 92);
    submitButton.onUp.connect(onSubmit);

    container.addChild(message, submitButton);
    loginForm.addChild(container);
  }

  private _renderErrorMessage(): void {
    const loginForm = this._loginForm;

    const message = new Text({
      text: i18next.t('error.an_error_has_occured_please_contact_admin'),
      style: {
        align: 'center',
        fill: '#fefefe',
        fontSize: 14,
        wordWrap: true,
        wordWrapWidth: 180
      }
    });
    message.position.set((loginForm.width - message.width) / 2, 48);

    loginForm.addChild(message);
  }

  private _createSubmitButton(): FancyButton {
    return new FancyButton({
      defaultView: createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8),
      hoverView: createRect(0, 0, 100, 30, 'rgb(77, 225, 255)', 8),
      pressedView: createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8),
      text: i18next.t('login.submit_button'),
      padding: 4
    });
  }

  private _createFooter(): Container {
    const container = new Container();
    const bg = createRect(0, 0, this._background.width, 40, 'rgba(0, 0, 0, 0.6)');

    this._loginMessage = new Text({
      text: i18next.t('game_desc'),
      style: {
        fill: '#fefefe',
        fontSize: 14
      }
    });
    this._loginMessage.anchor.set(0.5, 0.5);
    this._loginMessage.position.set(bg.width / 2, bg.height / 2);

    container.addChild(bg, this._loginMessage);
    return container;
  }

  private async _attemptLogin(): Promise<void> {
    if (this._isLoggingIn) {
      return;
    }

    const loginControls = this._loginForm.children[2];
    const [accountName, password] = loginControls.children as [Input, Input];

    this._clickSound.play();

    if (!accountName?.value) {
      this._loginMessage.text = i18next.t('login.insert_id');
      return;
    }

    if (!password?.value) {
      this._loginMessage.text = i18next.t('login.insert_password');
      return;
    }

    this._isLoggingIn = true;

    let url = `${getRequestProtocol('http')}://${import.meta.env.YGO_HOST}/login`;

    // Player has already attempted to login with this account but it's already in use
    if (this._accountNameToReconnect) {
      if (this._accountNameToReconnect === accountName.value) {
        url += '?force';
      }

      this._accountNameToReconnect = null;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          accountName: accountName.value,
          password: password.value
        })
      });

      switch (response.status) {
        case 200:
        case 201: {
          const sessionId = await response.text();
          const messageId = response.status === 201 ? 'login.account_created_successfully' : 'login.account_authenticated_successfully';

          this._loginMessage.text = i18next.t(messageId);
          await this._establishConnection(sessionId);
          break;
        }
        case 400: {
          this._loginMessage.text = i18next.t('login.insert_id_password');
          break;
        }
        case 401: {
          password.value = '';
          this._loginMessage.text = i18next.t('login.invalid_credentials');
          break;
        }
        case 409: {
          this._accountNameToReconnect = accountName.value;
          this._loginMessage.text = i18next.t('login.account_already_in_use');
          break;
        }
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    }

    this._isLoggingIn = false;
  }

  private async _reconnect(sessionId: string): Promise<void> {
    if (this._isLoggingIn) {
      return;
    }

    this._clickSound.play();

    this._isLoggingIn = true;
    await this._establishConnection(sessionId);
    this._isLoggingIn = false;
  }

  private async _initAuthState(): Promise<void> {
    try {
      const response = await fetch(`${getRequestProtocol('http')}://${import.meta.env.YGO_HOST}/init`, {
        method: 'POST',
        credentials: 'include'
      });

      switch (response.status) {
        case 204:
          this._renderLoginControls((_button: Button, _event: FederatedPointerEvent) => this._attemptLogin());
          break;
        case 409: {
          const sessionId = await response.text();
          this._renderAccountUsedContent((_button: Button, _event: FederatedPointerEvent) => this._reconnect(sessionId));
          break;
        }
        default:
          this._renderErrorMessage();
          break;
      }
    } catch (err) {
      this._renderErrorMessage();
      log.error(err instanceof Error ? err.message : err);
    }

    this.animate({
      from: 0,
      to: 1,
      onUpdate: (value: number) => {
        this._loginForm.alpha = value;
      }
    });
  }

  private async _establishConnection(sessionId: string): Promise<void> {
    const socket = client.connect({
      withCredentials: true
    });

    return new Promise((resolve) => {
      socket.once('connect', async () => {
        client.sessionId = sessionId;
  
        storage.loadSettings();
  
        getNavigator().navigate({
          createPage: () => new MenuPage(),
          transition: {
            filter: new FadeColorFilter(),
            duration: 2000
          }
        });

        resolve();
      });
    });
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule: any) => {
    if (newModule) {
      if (getNavigator().currentPage instanceof LoginPage) {
        getNavigator().navigate({
          createPage: () => new newModule.default()
        });
      }
    }
  });
}

export default LoginPage;