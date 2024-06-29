type AcknowledgementCallback = (response: ArrayBuffer) => void;

interface ClientToServerEvents {
  playerCardsRequest: (buffer: ArrayBuffer, callback: AcknowledgementCallback) => void;
  playerNewCardAction: (buffer: ArrayBuffer) => void;
}

interface ServerToClientEvents {
  playerCardsResponse: () => void;
}

export {
  AcknowledgementCallback,
  ClientToServerEvents,
  ServerToClientEvents
};