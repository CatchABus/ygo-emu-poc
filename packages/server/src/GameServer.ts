import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import log, { LogLevelDesc } from 'loglevel';
import { Server } from 'socket.io';
import { CardData } from './data/CardData';
import { CPUDeckData } from './data/CPUDeckData';
import { DatabaseSource } from './databaseSource';
import { onConnection, onHandshakeRequest } from './network/connectionHandler';
import { httpHandler } from './network/httpHandler';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './network/packetTypes';

const PORT = parseInt(process.env.GAMESERVER_PORT);
const secure: boolean = !!(process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH);

let _gs: Server;

function getGameServer(): Server {
  return _gs;
}

async function startGameServer(): Promise<void> {
  log.setDefaultLevel(<LogLevelDesc>process.env.DEFAULT_LOGGING_LEVEL);

  const httpServer = secure ? createSecureServer(httpHandler) : createServer(httpHandler);
  
  CardData.getInstance().load();
  CPUDeckData.getInstance().load();
  await DatabaseSource.getInstance().initialize();

  _gs = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    allowRequest: onHandshakeRequest,
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true
    }
  });
  _gs.on('connection', onConnection);

  httpServer.listen(PORT, () => {
    log.info(`Game server listening on port: ${PORT}`);
  });
}

export {
  getGameServer,
  startGameServer
};