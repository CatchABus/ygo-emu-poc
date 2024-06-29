import { Socket } from 'socket.io';
import { AbstractSendablePacket } from './sendable/AbstractSendablePacket';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './packetTypes';

class GameClient {
  private readonly _socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this._socket = socket;
  }

  get socket(): Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    return this._socket;
  }

  getPacketContent(sp: AbstractSendablePacket): Buffer {
    sp.writeToBuffer();
    return sp.buffer;
  }

  sendPacket(sp: AbstractSendablePacket): void {
    this.socket.emit(sp.getEventName() as keyof ServerToClientEvents, this.getPacketContent(sp));
  }

  broadcastToOthers(sp: AbstractSendablePacket): void {
    this.socket.broadcast.emit(sp.getEventName() as keyof ServerToClientEvents, this.getPacketContent(sp));
  }

  close(): void {
    this.socket.disconnect(true);
  }
}

export {
  GameClient
};