type AcknowledgementCallback = (response: ArrayBuffer) => void;

interface ClientToServerEvents {
  cardInventoryRequest: (buffer: ArrayBuffer, callback: AcknowledgementCallback) => void;
  cardListRequest: (buffer: ArrayBuffer, callback: AcknowledgementCallback) => void;
  playerNewCardAction: (buffer: ArrayBuffer) => void;
}

interface ServerToClientEvents {
  cardInventoryResponse: () => void;
  cardListResponse: () => void;
}

export {
  AcknowledgementCallback,
  ClientToServerEvents,
  ServerToClientEvents
};