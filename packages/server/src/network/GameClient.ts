import { Socket } from 'socket.io';
import { AbstractSendablePacket } from './sendable/AbstractSendablePacket';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './packetTypes';
import { randomUUID } from 'crypto';

enum ClientState {
  DISCONNECTED,
  AUTHENTICATED,
  CONNECTED
}

type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

class GameClient {
  private readonly _sessionId: string;
  private readonly _accountName: string;

  private _socket: ClientSocket;
  private _state: ClientState = ClientState.AUTHENTICATED;

  constructor(accountName: string) {
    this._sessionId = randomUUID();
    this._accountName = accountName;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  get accountName(): string {
    return this._accountName;
  }

  get socket(): ClientSocket {
    return this._socket;
  }

  set socket(val: ClientSocket) {
    this._socket = val;
  }

  get state(): ClientState {
    return this._state;
  }

  set state(val: ClientState) {
    this._state = val;
  }

  getPacketContent(sp: AbstractSendablePacket): Buffer {
    sp.writeToBuffer();
    return sp.buffer;
  }

  sendPacket(sp: AbstractSendablePacket): void {
    const socket = this.socket;
    if (socket) {
      socket.emit(sp.getEventName() as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  broadcastToOthers(sp: AbstractSendablePacket): void {
    const socket = this.socket;
    if (socket) {
      socket.broadcast.emit(sp.getEventName() as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  close(): void {
    const socket = this.socket;
    if (socket) {
      socket.data.gameClient = null;
      socket.removeAllListeners();
      socket.disconnect(true);
    }
  }
}

export {
  ClientState,
  GameClient
};