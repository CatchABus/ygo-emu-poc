import { PlayerCardsRequest } from './receivable/PlayerCardsRequest';
import { GameClient } from './GameClient';
import { AcknowledgementCallback } from './packetTypes';
import { PlayerNewCardAction } from './receivable/PlayerNewCardAction';

function registerClientPacketHandler(client: GameClient): void {
  client.socket.on('playerCardsRequest', (buffer: Buffer, callback: AcknowledgementCallback) => {
    const packet = new PlayerCardsRequest(client, buffer, 'playerCardsRequest');
    callback(packet.readFromBuffer());
  });

  client.socket.on('playerNewCardAction', (buffer: Buffer) => {
    const packet = new PlayerNewCardAction(client, buffer, 'playerNewCardAction');
    packet.readFromBuffer();
  });
}

export {
  registerClientPacketHandler
};