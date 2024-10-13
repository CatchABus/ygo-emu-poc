import { Socket } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './packetTypes';
import { registerClientPacketHandler } from './clientPacketHandler';
import { ClientState, GameClient } from './GameClient';
import { LoginController } from '../login';
import { IncomingMessage } from 'http';
import log from 'loglevel';

interface HandshakeMessage extends IncomingMessage {
  gameClient: GameClient;
}

function onConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
  const { gameClient } = socket.request as HandshakeMessage;
  if (gameClient != null) {
    gameClient.socket = socket;
    socket.data.gameClient = gameClient;
    registerClientPacketHandler(gameClient);
  } else {
    log.warn(`Could not find client for socket '${socket.id}' to connect`);
  }
}

function onHandshakeRequest(req: IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void): void {
  const handshakeReq = req as HandshakeMessage;
  const { cookie } = handshakeReq.headers;
  let isAuthenticated = false;

  if (cookie) {
    const lc = LoginController.getInstance();
    const payload = lc.parseAuthenticationCookie(cookie);

    if (payload != null) {
      const client = lc.getClientByLogin(payload.accountName);

      if (client) {
        if (client.state === ClientState.AUTHENTICATED) {
          if (client.sessionId === payload.sessionId) {
            handshakeReq.gameClient = client;
            isAuthenticated = true;
          } else {
            log.warn(`Account '${payload.accountName}' attempted to handshake using a client with outdated session`);
          }
        } else {
          log.warn(`Account '${payload.accountName}' attempted to handshake without without authentication`);
        }
      } else {
        log.warn(`Account '${payload.accountName}' attempted to handshake without client`);
      }
    }
  }

  if (isAuthenticated) {
    callback(null, true);
  } else {
    delete handshakeReq.gameClient;
    callback(null, false);
  }
}

export {
  onConnection,
  onHandshakeRequest
};