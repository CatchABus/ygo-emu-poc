import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { CardList } from '../sendable/CardList';
import { AbstractReceivablePacket, PacketEventName } from './AbstractReceivablePacket';

@PacketEventName('cardListRequest')
class CardListRequest extends AbstractReceivablePacket {
  read(): AbstractSendablePacket {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    return new CardList(player.getAllCards());
  }
}

export {
  CardListRequest
};
