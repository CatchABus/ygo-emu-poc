import log from 'loglevel';
import { GameClient } from './GameClient';
import { AcknowledgementCallback, ClientToServerEvents } from './packetTypes';
import { CardInventoryRequest } from './receivable/CardInventoryRequest';
import { CardListRequest } from './receivable/CardListRequest';
import { PlayerNewCardAction } from './receivable/PlayerNewCardAction';

function registerClientPacketHandler(client: GameClient): void {
  const packetMap: ClientToServerEvents = {
    'cardListRequest': (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardListRequest(client, buffer);
      callback(packet.readFromBuffer() as Buffer);
    },
    'cardInventoryRequest': (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardInventoryRequest(client, buffer);
      callback(packet.readFromBuffer() as Buffer);
    },
    'playerNewCardAction': (buffer: Buffer) => {
      const packet = new PlayerNewCardAction(client, buffer);
      packet.readFromBuffer();
    }
  };

  for (const key in packetMap) {
    client.socket.on(key as any, (packetMap as any)[key]);
  }

  // Unknown packet handling
  client.socket.onAny((eventName: string, ..._args) => {
    if (!(eventName in packetMap)) {
      log.warn(`Unknown incoming packet '${eventName}'`);
    }
  });
}

export {
  registerClientPacketHandler
};
