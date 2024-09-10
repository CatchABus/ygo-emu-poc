import { CPUDeckData } from '../../data/CPUDeckData';
import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { CardList } from '../sendable/CardList';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class CardListRequest extends AbstractReceivablePacket {
  read(): AbstractSendablePacket {
    const deckIds = CPUDeckData.getInstance().getDecks().get('playerStarter');
    const cardData = deckIds.map((id: number) => {
      return {
        id,
        isNew: id === 3366982 || id === 78658564
      };
    })

    return new CardList(cardData);
  }
}

export {
  CardListRequest
};