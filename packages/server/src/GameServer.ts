import { createServer, Server as HttpServer } from 'http';
import { createServer as createSecureServer, Server as HttpSecureServer } from 'https';
import log, { LogLevelDesc } from 'loglevel';
import { Server } from 'socket.io';
import { CardData } from './data/CardData';
import { CPUDeckData } from './data/CPUDeckData';
import { onConnection, onHandshakeRequest } from './network/connectionHandler';
import { httpHandler } from './network/httpHandler';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './network/packetTypes';
import { LoginController } from './login';
import { AppDataSource } from './AppDataSource';

const PORT = parseInt(process.env.GAMESERVER_PORT);
const secure: boolean = !!(process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH);

let instance: GameServerImpl = null;

class GameServerImpl {
  private mServer: Server;
  private mHttpServer: HttpServer | HttpSecureServer;

  constructor() {
    this.start();
  }

  async start(): Promise<void> {
    log.setDefaultLevel(<LogLevelDesc>process.env.DEFAULT_LOGGING_LEVEL);

    LoginController.getInstance();
    CardData.getInstance().load();
    CPUDeckData.getInstance().load();
    await AppDataSource.getInstance().initialize();

    this.mHttpServer = secure ? createSecureServer(httpHandler) : createServer(httpHandler);
  
    this.mServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(this.mHttpServer, {
      allowRequest: onHandshakeRequest,
      cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
      }
    });
    this.mServer.on('connection', onConnection);
  
    this.addShutDownListeners();
  
    this.mHttpServer.listen(PORT, () => {
      log.info(`Game server listening on port: ${PORT}`);
    });
  }

  addShutDownListeners(): void {
    const shutDownHandler = async () => await this.shutDown();

    process.on('SIGINT', shutDownHandler);  // e.g. when pressing Ctrl+C
    process.on('SIGTERM', shutDownHandler); // e.g. when stopping the process via system signals
  }

  async shutDown(): Promise<void> {
    // Disconnect online clients before anything else
    await LoginController.getInstance().disconnectAllClients();

    try {
      await AppDataSource.getInstance().destroy();
    } catch(err) {
      log.error(err);
    }

    if (this.mServer) {
      await this.mServer.close();
      this.mServer = null;
    }

    if (this.mHttpServer) {
      this.mHttpServer.close((err?: Error) => {
        log.error('Failed to shut down http server. Reason: ' + err);
      });
      this.mHttpServer = null;
    }

    log.error('Game Server was shut down successfully!');
  }

  getServer(): Server {
    return this.mServer;
  }
}

export const GameServer = {
  getInstance(): GameServerImpl {
    if (instance == null) {
      instance = new GameServerImpl();
    }

    return instance;
  }
};