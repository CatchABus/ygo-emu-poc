import { Input } from '@pixi/ui';
import { Howl } from 'howler';
import i18next from 'i18next';
import * as log from 'loglevel';
import { atom } from 'nanostores';
import { AdjustmentFilter } from 'pixi-filters';
import { Assets, Container, Graphics, Text, Texture } from 'pixi.js';
import { client } from '../client';
import { getCurrentLocale } from '../i18n';
import { getNavigator } from '../navigation';
import { ReceivablePacket } from '../network/ReceivablePacket';
import { createRect, getRequestProtocol } from '../util/helpers';
import { BasePage } from './BasePage';
import MenuPage from './MenuPage';

const FORM_WIDTH = 200;
const FORM_HEIGHT = 180;

class LoginPage extends BasePage {
  private mLoginForm: Container;
  private mClickSound: Howl;
  private mIsLoggingIn: boolean;
  private mAccountNameToReconnect: string;
  private mSessionId: string;
  private mResponseMsg = atom(i18next.t('game_desc'));

  async preload(): Promise<void> {
    await Assets.loadBundle(['default', 'joey']);
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
    const assetPrefix = client.gameMode;
    const locale = getCurrentLocale();
    const filters = [new AdjustmentFilter({
      brightness: 0.7
    })];
    const bg = (<sprite texture={Texture.from(`${assetPrefix}/title_1_${locale}.png`)} filters={filters}></sprite>);
    const footerHeight = 40;

    this.mClickSound = new Howl({
      src: 'commons/decide.ogg'
    });
    this.mLoginForm = this._createLoginForm();

    const footer = (
      <container x={0} y={560}>
        <graphics afterCreate={(g: Graphics) => g.rect(0, 0, bg.width, footerHeight).fill('rgba(0, 0, 0, 0.6)')}></graphics>
        <text text={this.mResponseMsg} style={{ fill: '#fefefe', fontSize: 14 }} position={{ x: bg.width / 2, y: footerHeight / 2 }} anchor={{ x: 0.5, y: 0.5 }}></text>
      </container>
    );

    this.addChild(bg, this.mLoginForm, footer);
  }

  private _createLoginForm(): Container {
    const centerX = FORM_WIDTH / 2;
    const afterGraphCreate = (g: Graphics) => {
      g.roundRect(0, 0, FORM_WIDTH, FORM_HEIGHT, 20).fill('rgba(0, 0, 0, 0.6)');
    };

    const form = (
      <container x={400} y={300} alpha={0} pivot={{
        x: FORM_WIDTH / 2,
        y: FORM_HEIGHT / 2
      }}>
        <graphics afterCreate={afterGraphCreate}>
        </graphics>
        <text x={centerX} y={24} text={import.meta.env.YGO_TITLE ?? ''} style={{
          fill: '#fefefe',
          fontSize: 20
        }} anchor={{
          x: 0.5,
          y: 0.5
        }}></text>
      </container>
    );

    return form;
  }

  private _createLoginControls(): Container {
    const inputWidth = 160;
    const loginBg = new Graphics().roundRect(0, 0, inputWidth, 30, 5).fill('#fefefe');
    const pwdBg = new Graphics().roundRect(0, 0, inputWidth, 30, 5).fill('#fefefe');
    const inputPivotPoint = {
      x: inputWidth / 2,
      y: 0
    };

    return (
      <container y={48}>
        <input x={(FORM_WIDTH / 2)} y={0} pivot={inputPivotPoint} bg={loginBg} placeholder={i18next.t('login.id')} textStyle={{ fontSize: 16 }} padding={8} addMask={true}>
        </input>
        <input x={(FORM_WIDTH / 2)} y={40} pivot={inputPivotPoint} bg={pwdBg} placeholder={i18next.t('login.password')} textStyle={{ fontSize: 16 }} padding={8} addMask={true} secure={true}>
        </input>
        <fancyButton x={FORM_WIDTH / 2} y={92} text={i18next.t('login.submit_button')} padding={4} anchorX={0.5} defaultView={createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8)}
          hoverView={createRect(0, 0, 100, 30, 'rgb(77, 225, 255)', 8)} pressedView={createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8)}
          onUpSignal={() => this._attemptLogin()}></fancyButton>
      </container>
    );
  }

  private _createAccountUsedMsg(): Container {
    return (
      <container y={48}>
        <text afterCreate={(txt) => txt.position.set((FORM_WIDTH - txt.width) / 2, 0)} text={i18next.t('login.account_already_in_use')} style={{
          align: 'center',
          fill: '#fefefe',
          fontSize: 14,
          wordWrap: true,
          wordWrapWidth: 180
        }}></text>
        <fancyButton x={FORM_WIDTH / 2} y={92} text={i18next.t('login.submit_button')} padding={4} anchorX={0.5} defaultView={createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8)}
          hoverView={createRect(0, 0, 100, 30, 'rgb(77, 225, 255)', 8)} pressedView={createRect(0, 0, 100, 30, 'rgb(0, 180, 216)', 8)}
          onUpSignal={() => this._reconnect()}></fancyButton>
      </container>
    );
  }

  private _renderErrorMsg(): Text {
    return (
      <text afterCreate={(txt) => txt.position.set((FORM_WIDTH - txt.width) / 2, 48)} text={i18next.t('error.an_error_has_occured_please_contact_admin')} style={{
        align: 'center',
        fill: '#fefefe',
        fontSize: 14,
        wordWrap: true,
        wordWrapWidth: 180
      }}></text>
    );
  }

  private async _attemptLogin(): Promise<void> {
    if (this.mIsLoggingIn) {
      return;
    }

    const loginControls = this.mLoginForm.children[2];
    const [accountName, password] = loginControls.children as [Input, Input];

    this.mIsLoggingIn = true;

    this.mClickSound.play();

    try {
      if (!accountName?.value) {
        this.mResponseMsg.set(i18next.t('login.insert_id'));
        return;
      }

      if (!password?.value) {
        this.mResponseMsg.set(i18next.t('login.insert_password'));
        return;
      }

      let url = `${getRequestProtocol('http')}://${import.meta.env.YGO_HOST}/login`;

      // Player has already attempted to login with this account but it's already in use
      if (this.mAccountNameToReconnect) {
        if (this.mAccountNameToReconnect === accountName.value) {
          url += '?force';
        }

        this.mAccountNameToReconnect = null;
      }

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

          this.mResponseMsg.set(i18next.t(messageId));
          this.mSessionId = sessionId;
          await this._establishConnection();
          break;
        }
        case 400: {
          this.mResponseMsg.set(i18next.t('login.insert_id_password'));
          break;
        }
        case 401: {
          password.value = '';
          this.mResponseMsg.set(i18next.t('login.invalid_credentials'));
          break;
        }
        case 409: {
          this.mAccountNameToReconnect = accountName.value;
          this.mResponseMsg.set(i18next.t('login.account_already_in_use'));
          break;
        }
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : err);
    } finally {
      this.mIsLoggingIn = false;
    }
  }

  private async _reconnect(): Promise<void> {
    if (this.mIsLoggingIn) {
      return;
    }

    this.mIsLoggingIn = true;

    this.mClickSound.play();
    await this._establishConnection();

    this.mIsLoggingIn = false;
  }

  private async _initAuthState(): Promise<void> {
    let formContent: Container;

    try {
      const response = await fetch(`${getRequestProtocol('http')}://${import.meta.env.YGO_HOST}/init`, {
        method: 'POST',
        credentials: 'include'
      });

      switch (response.status) {
        case 204:
          formContent = this._createLoginControls();
          break;
        case 409:
          this.mSessionId = await response.text();
          formContent = this._createAccountUsedMsg();
          break;
        default:
          formContent = this._renderErrorMsg();
          break;
      }
    } catch (err) {
      formContent = this._renderErrorMsg();
      log.error(err);
    }

    this.mLoginForm.addChild(formContent);

    this.animate({
      from: 0,
      to: 1,
      onUpdate: (value: number) => {
        this.mLoginForm.alpha = value;
      }
    });
  }

  private async _establishConnection(): Promise<void> {
    const socket = client.connect({
      withCredentials: true
    });

    return new Promise((resolve) => {
      socket.once('connect', async () => {
        client.sessionId = this.mSessionId;

        const responseBuffer = await client.getSocket().emitWithAck('playerOptionsRequest', new ArrayBuffer(0));
        const packet = new ReceivablePacket(responseBuffer);

        setTimeout(() => {
          client.volume = packet.readFloat();
          client.isForbiddenCardsEnabled = !!packet.readInt8();
          client.isFullScreenEnabled = !!packet.readInt8();

          getNavigator().navigate({
            createPage: () => new MenuPage(),
          });

          resolve();
        }, 1000);
      });
    });
  }
}

export default LoginPage;