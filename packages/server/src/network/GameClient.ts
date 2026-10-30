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
  private readonly mSessionId: string;
  private readonly mAccountName: string;

  private mSocket: ClientSocket;
  private mState: ClientState = ClientState.AUTHENTICATED;
  private mPlayer: Player;
  private mPacketHandler: ClientPacketHandler;

  constructor(accountName: string) {
    this.mSessionId = randomUUID();
    this.mAccountName = accountName;
  }

  get state(): ClientState {
    return this.mState;
  }

  set state(val: ClientState) {
    this.mState = val;
  }

  get player(): Player {
    return this.mPlayer;
  }

  set player(val: Player) {
    this.mPlayer = val;
  }

  getSessionId(): string {
    return this.mSessionId;
  }

  getAccountName(): string {
    return this.mAccountName;
  }

  getSocket(): ClientSocket {
    return this.mSocket;
  }

  getPacketContent(sp: AbstractSendablePacket): Buffer {
    sp.writeToBuffer();
    return sp.buffer;
  }

  sendPacket(sp: AbstractSendablePacket): void {
    const socket = this.mSocket;
    if (socket) {
      socket.emit(sp.eventName as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  broadcastToOthers(sp: AbstractSendablePacket): void {
    const socket = this.mSocket;
    if (socket) {
      socket.broadcast.emit(sp.eventName as keyof ServerToClientEvents, this.getPacketContent(sp));
    }
  }

  connect(socket: ClientSocket): void {
    this.mSocket = socket;
    socket.data.gameClient = this;

    this.mPacketHandler = new ClientPacketHandler(this);
    this.mPacketHandler.register();
  }

  async close(): Promise<void> {
    const socket = this.mSocket;
    const player = this.player;

    if (player) {
      await player.save();
    }

    if (this.mPacketHandler) {
      this.mPacketHandler.unregister();
      this.mPacketHandler = null;
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