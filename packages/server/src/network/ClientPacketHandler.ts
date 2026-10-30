import * as log from 'loglevel';
import { ClientSocket, GameClient } from './GameClient';
import { AcknowledgementCallback, ClientToServerEvents } from './packetTypes';
import type { AbstractReceivablePacket } from './receivable/AbstractReceivablePacket';
import { CardInventoryRequest } from './receivable/CardInventoryRequest';
import { CardListRequest } from './receivable/CardListRequest';
import { ClearCardNewStateRequest } from './receivable/ClearCardNewStateRequest';
import { PlayerDeckRequest } from './receivable/PlayerDeckRequest';
import { PlayerOptionsRequest } from './receivable/PlayerOptionsRequest';
import { PlayerOptionsUpdateRequest } from './receivable/PlayerOptionsUpdateRequest';

const PACKET_EVENT_MAP: Record<keyof ClientToServerEvents, typeof AbstractReceivablePacket> = {
  'cardInventoryRequest': CardInventoryRequest,
  'cardListRequest': CardListRequest,
  'clearCardNewStateRequest': ClearCardNewStateRequest,
  'PlayerDeckRequest': PlayerDeckRequest,
  'playerOptionsRequest': PlayerOptionsRequest,
  'playerOptionsUpdateRequest': PlayerOptionsUpdateRequest
};

for (const key in PACKET_EVENT_MAP) {
  Object.defineProperty(PACKET_EVENT_MAP[key].prototype, 'eventName', {
    value: key,
    enumerable: false,
    writable: false,
    configurable: false
  });
}

class ClientPacketHandler {
  private readonly mSocket: ClientSocket;
  private readonly mOnAnyCb: (eventName: string, ..._args) => void;
  private readonly mOnPacketCbs = new Map<keyof ClientToServerEvents, (buffer: Buffer, callback?: AcknowledgementCallback) => void>();

  constructor(client: GameClient) {
    this.mSocket = client.getSocket();
    this.mOnAnyCb = (eventName: keyof ClientToServerEvents, ..._args) => {
      if (!(eventName in PACKET_EVENT_MAP)) {
        log.warn(`Unknown incoming packet '${eventName}'`);
      }
    };

    for (const key in PACKET_EVENT_MAP) {
      this.mOnPacketCbs.set(key as keyof ClientToServerEvents, async (buffer: Buffer, callback?: AcknowledgementCallback) => {
        const packet = new PACKET_EVENT_MAP[key](client, buffer);
        const responseBuffer = await packet.handle() as Buffer;

        if (responseBuffer instanceof Buffer) {
          callback(responseBuffer);
        }
      });
    }
  }

  public register(): void {
    for (const [key, value] of this.mOnPacketCbs) {
      this.mSocket.on(key, value);
    }

    // Unknown packet handling
    this.mSocket.onAny(this.mOnAnyCb);
  }

  public unregister(): void {
    for (const [key, value] of this.mOnPacketCbs) {
      this.mSocket.off(key, value);
    }

    // Unknown packet handling
    this.mSocket.offAny(this.mOnAnyCb);
  }
}

export {
  ClientPacketHandler
};

