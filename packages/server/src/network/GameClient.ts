import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import { Player } from '../model/database/Player';
import { ClientPacketHandler } from './ClientPacketHandler';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './packetTypes';
import { AbstractSendablePacket } from './sendable/AbstractSendablePacket';

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
  private _player: Player;
  private _packetHandler: ClientPacketHandler;

  constructor(accountName: string) {
    this._sessionId = randomUUID();
    this._accountName = accountName;
  }

  get state(): ClientState {
    return this._state;
  }

  set state(val: ClientState) {
    this._state = val;
  }

  get player(): Player {
    return this._player;
  }

  set player(val: Player) {
    this._player = val;
  }

  getSessionId(): string {
    return this._sessionId;
  }

  getAccountName(): string {
    return this._accountName;
  }

  getSocket(): ClientSocket {
    return this._socket;
  }

  getPacketContent(sp: AbstractSendablePacket): Buffer {
    sp.writeToBuffer();
    return sp.buffer;
  }

  sendPacket(sp: AbstractSendablePacket): void {
    const socket = this._socket;
    if (socket) {
      socket.emit(sp.eventName as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  broadcastToOthers(sp: AbstractSendablePacket): void {
    const socket = this._socket;
    if (socket) {
      socket.broadcast.emit(sp.eventName as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  connect(socket: ClientSocket): void {
    this._socket = socket;
    socket.data.gameClient = this;

    this._packetHandler = new ClientPacketHandler(this);
    this._packetHandler.register();
  }

  async close(): Promise<void> {
    const socket = this._socket;
    const player = this.player;

    if (player) {
      await player.save();
    }

    if (this._packetHandler) {
      this._packetHandler.unregister();
      this._packetHandler = null;
    }

    if (socket) {
      socket.data.gameClient = null;
      socket.removeAllListeners();
      socket.disconnect(true);
    }
  }
}

export {
  ClientSocket,
  ClientState,
  GameClient
};