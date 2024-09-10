import { GameClient } from './GameClient';

type AcknowledgementCallback = (data: Buffer) => void;

interface ServerToClientEvents {
    cardInventoryResponse: (buffer: Buffer) => void;
    cardListResponse: (buffer: Buffer) => void;
}

interface ClientToServerEvents {
    cardInventoryRequest: (buffer: Buffer, callback: AcknowledgementCallback) => void;
    cardListRequest: (buffer: Buffer, callback: AcknowledgementCallback) => void;
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