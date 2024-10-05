import log from 'loglevel';
import { GameClient } from './GameClient';
import { AcknowledgementCallback, ClientToServerEvents } from './packetTypes';
import { CardInventoryRequest } from './receivable/CardInventoryRequest';
import { CardListRequest } from './receivable/CardListRequest';
import { PlayerNewCardAction } from './receivable/PlayerNewCardAction';

function registerClientPacketHandler(client: GameClient): void {
  const packetMap: ClientToServerEvents = {
    'cardListRequest': async (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardListRequest(client, buffer);
      const readBuffer = await packet.readWithResult() as Buffer;
      callback(readBuffer);
    },
    'cardInventoryRequest': async (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardInventoryRequest(client, buffer);
      const readBuffer = await packet.readWithResult() as Buffer;
      callback(readBuffer);
    },
    'playerNewCardAction': async (buffer: Buffer) => {
      const packet = new PlayerNewCardAction(client, buffer);
      await packet.readWithResult();
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
