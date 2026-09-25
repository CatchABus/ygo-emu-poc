import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { CardList } from '../sendable/CardList';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class CardListRequest extends AbstractReceivablePacket {
  run(): AbstractSendablePacket {
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
