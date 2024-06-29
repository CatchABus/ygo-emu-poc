import { GameClient } from './GameClient';

type AcknowledgementCallback = (data: Buffer) => void;

interface ServerToClientEvents {
    playerCardsResponse: (buffer: Buffer) => void;
}

interface ClientToServerEvents {
    playerCardsRequest: (buffer: Buffer, callback: AcknowledgementCallback) => void;
    playerNewCardAction: (buffer: Buffer) => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    client: GameClient
}

export {
  AcknowledgementCallback,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
};