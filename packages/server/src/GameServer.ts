import log, { LogLevelDesc } from 'loglevel';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './network/packetTypes';
import { onConnection } from './network/connectionHandler';
import { CardData } from './data/CardData';
import { CPUDeckData } from './data/CPUDeckData';

const PORT = parseInt(process.env.SERVER_PORT);

let _gs: Server;

function startGameServer(): void {
  log.setDefaultLevel(<LogLevelDesc>process.env.DEFAULT_LOGGING_LEVEL);
  
  CardData.getInstance().load();
  CPUDeckData.getInstance().load();

  _gs = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(PORT, {
    cors: {
      origin: process.env.CORS_ORIGIN
    }
  });
  _gs.on('connection', onConnection);

  log.info(`Game server listening on port: ${PORT}`);
}

export default {
  getInstance: () => _gs
};

export {
  startGameServer
};