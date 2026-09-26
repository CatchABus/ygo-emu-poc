import { Howler } from 'howler';
import * as log from 'loglevel';
import { Application, ApplicationOptions } from 'pixi.js';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { getRequestProtocol } from './util/helpers';

const DEFAULT_VOLUME = 0.5;

function onConnectionError(err: Error): void {
  log.error(err);
}

class Client {
  private mApplication: Application;
  private mSocket: Socket;
  private mSessionId: string;
  private mGameMode: GameMode = 'joey'; // Default
  private mVolume: number = Howler.volume();
  private mIsForbiddenCardsEnabled: boolean = false;
  private mIsFullScreenEnabled: boolean = false;
  /**
   * This flag helps distinguish sign out disconnection from abnormal disconnection.
   */
  private mIsLogoutRequested: boolean = false;

  private mDisconnectListener: (reason: Socket.DisconnectReason) => void = null;

  constructor() {
    const volumeStr = localStorage.getItem('volume');
    const fullScreenStr = localStorage.getItem('fullScreenEnabled');

    this.volume = volumeStr ? parseFloat(volumeStr) : DEFAULT_VOLUME;
    this.isFullScreenEnabled = fullScreenStr === 'true';
  }

  isApplicationStarted(): boolean {
    return this.mApplication != null;
  }

  getApplication(): Application {
    if (this.mApplication == null) {
      throw new Error('Application is not initialized!');
    }
    return this.mApplication;
  }

  async start(options?: Partial<ApplicationOptions>): Promise<Application> {
    if (this.mApplication != null) {
      throw new Error('Application is already initialized!');
    }

    this.mApplication = new Application();

    await this.mApplication.init(options);

    return this.mApplication;
  }

  getSocket(): Socket {
    if (this.mSocket == null) {
      throw new Error('Failed to request data from server. Client is not connected!');
    }
    return this.mSocket;
  }

  connect(options?: Partial<ManagerOptions & SocketOptions>): Socket {
    if (this.mSocket != null) {
      throw new Error('Client is already connected!');
    }

    const socket = io(`${getRequestProtocol('ws')}://${import.meta.env.YGO_HOST}`, {
      ...options,
      reconnection: false
    });

    this.mSocket = socket;

    this.mDisconnectListener = (reason) => {
      if (this.mIsLogoutRequested) {
        this.mIsLogoutRequested = false;
      } else {
        log.warn(`Client session '${this.mSessionId}' was disconnected abnormally! Reason: ${reason}`);
      }

      this.disconnect();
    };

    socket.on('connect_error', onConnectionError);
    socket.on('disconnect', this.mDisconnectListener);

    return socket;
  }

  disconnect(): void {
    if (this.mSocket == null) {
      throw new Error('Client is not connected!');
    }

    this.mSessionId = null;

    this.mSocket.off('connection_error', onConnectionError);
    this.mSocket.off('disconnect', this.mDisconnectListener);
    this.mDisconnectListener = null;
    
    this.mSocket.disconnect();
    this.mSocket = null;
  }

  get gameMode(): GameMode {
    return this.mGameMode;
  }

  set gameMode(val: GameMode) {
    this.mGameMode = val;
  }

  get isLogoutRequested(): boolean {
    return this.mIsLogoutRequested;
  }

  set isLogoutRequested(val: boolean) {
    this.mIsLogoutRequested = val;
  }

  get sessionId(): string {
    return this.mSessionId;
  }

  set sessionId(val: string) {
    this.mSessionId = val;
  }

  get volume(): number {
    return this.mVolume;
  }

  set volume(val: number) {
    this.mVolume = val;

    localStorage.setItem('volume', this.mVolume.toString());
    Howler.volume(this.mVolume);
  }

  get isForbiddenCardsEnabled(): boolean {
    return this.mIsForbiddenCardsEnabled;
  }

  set isForbiddenCardsEnabled(val: boolean) {
    this.mIsForbiddenCardsEnabled = val;
  }

  /**
   * Note: Let user decide this on browser since we have multiple tabs and enforcing full screen is annoying.
   */
  get isFullScreenEnabled(): boolean {
    return this.mIsFullScreenEnabled;
  }

  set isFullScreenEnabled(val: boolean) {
    this.mIsFullScreenEnabled = val;
    localStorage.setItem('fullScreenEnabled', this.mIsFullScreenEnabled.toString());
  }
}

export const client = new Client();