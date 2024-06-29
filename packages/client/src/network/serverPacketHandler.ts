import { Socket, io } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from './packetTypes';

let _socket: Socket<ServerToClientEvents, ClientToServerEvents> = null;

async function init(): Promise<void> {
  return new Promise((resolve) => {
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      _socket = socket;
      resolve();
    });
  });
}

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  return _socket;
}

export {
  init,
  getSocket
};