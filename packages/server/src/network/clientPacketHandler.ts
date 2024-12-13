import * as log from 'loglevel';
import { GameClient } from './GameClient';
import { AcknowledgementCallback, ClientToServerEvents } from './packetTypes';
import { CardInventoryRequest } from './receivable/CardInventoryRequest';
import { CardListRequest } from './receivable/CardListRequest';
import { ClearCardNewStateRequest } from './receivable/ClearCardNewStateRequest';

function registerClientPacketHandler(client: GameClient): void {
  const packetMap: ClientToServerEvents = {
    'cardListRequest': async (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardListRequest(client, buffer);
      const responseBuffer = await packet.handle() as Buffer;
      callback(responseBuffer);
    },
    'cardInventoryRequest': async (buffer: Buffer, callback: AcknowledgementCallback) => {
      const packet = new CardInventoryRequest(client, buffer);
      const responseBuffer = await packet.handle() as Buffer;
      callback(responseBuffer);
    },
    'clearCardNewStateRequest': async (buffer: Buffer) => {
      const packet = new ClearCardNewStateRequest(client, buffer);
      await packet.handle();
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
