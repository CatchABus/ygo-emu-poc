import log from 'loglevel';
import { Application, ApplicationOptions } from 'pixi.js';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { getRequestProtocol } from './util/helpers';

function onConnectionError(err: Error): void {
  log.error(err);
}

class Client {
  private _application: Application;
  private _socket: Socket;
  private _sessionId: string;
  private _gameMode: GameMode = 'joey'; // Default
  /**
   * This flag helps distinguish sign out disconnection from abnormal disconnection.
   */
  private _isLogoutRequested: boolean = false;

  private _disconnectListener: (reason: Socket.DisconnectReason) => void = null;

  isApplicationStarted(): boolean {
    return this._application != null;
  }

  getApplication(): Application {
    if (this._application == null) {
      throw new Error('Application is not initialized!');
    }
    return this._application;
  }

  async start(options?: Partial<ApplicationOptions>): Promise<Application> {
    if (this._application != null) {
      throw new Error('Application is already initialized!');
    }

    this._application = new Application();

    await this._application.init(options);

    return this._application;
  }

  getSocket(): Socket {
    if (this._socket == null) {
      throw new Error('Failed to request data from server. Client is not connected!');
    }
    return this._socket;
  }

  connect(options?: Partial<ManagerOptions & SocketOptions>): Socket {
    if (this._socket != null) {
      throw new Error('Client is already connected!');
    }

    const socket = io(`${getRequestProtocol('ws')}://${import.meta.env.YGO_HOST}`, {
      ...options,
      reconnection: false
    });

    this._socket = socket;

    this._disconnectListener = (reason) => {
      if (this._isLogoutRequested) {
        this._isLogoutRequested = false;
      } else {
        log.warn(`Client session '${this._sessionId}' was disconnected abnormally! Reason: ${reason}`);
      }

      this.disconnect();
    };

    socket.on('connect_error', onConnectionError);
    socket.on('disconnect', this._disconnectListener);

    return socket;
  }

  disconnect(): void {
    if (this._socket == null) {
      throw new Error('Client is not connected!');
    }

    this._sessionId = null;

    this._socket.off('connection_error', onConnectionError);
    this._socket.off('disconnect', this._disconnectListener);
    this._disconnectListener = null;
    
    this._socket.disconnect();
    this._socket = null;
  }

  get gameMode(): GameMode {
    return this._gameMode;
  }

  set gameMode(val: GameMode) {
    this._gameMode = val;
  }

  get isLogoutRequested(): boolean {
    return this._isLogoutRequested;
  }

  set isLogoutRequested(val: boolean) {
    this._isLogoutRequested = val;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  set sessionId(val: string) {
    this._sessionId = val;
  }
}

export const client = new Client();