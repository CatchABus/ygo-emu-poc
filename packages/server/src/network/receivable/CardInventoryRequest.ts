import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { CardInventory } from '../sendable/CardInventory';
import { AbstractReceivablePacket, PacketEventName } from './AbstractReceivablePacket';

@PacketEventName('cardInventoryRequest')
class CardInventoryRequest extends AbstractReceivablePacket {
  run(): AbstractSendablePacket {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    return new CardInventory(player.getAllCards());
  }
}

export {
  CardInventoryRequest
};
