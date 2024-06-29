import { Socket } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './packetTypes';
import { GameClient } from './GameClient';
import { registerClientPacketHandler } from './clientPacketHandler';

function onConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
  socket.data.client = new GameClient(socket);
  registerClientPacketHandler(socket.data.client);
}

export {
  onConnection
};