import { CardData } from '../../data/CardData';
import { CPUDeckData } from '../../data/CPUDeckData';
import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { CardInventory } from '../sendable/CardInventory';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class CardInventoryRequest extends AbstractReceivablePacket {
  read(): AbstractSendablePacket {
    const deckIds = CPUDeckData.getInstance().getDecks().get('playerStarter');
    const cardData = deckIds.map((id: number) => {
      const deckLimit = CardData.getInstance().getDeckCardLimit(id);

      return {
        id,
        isNew: id === 3366982,
        count: 1,
        deckLimit
      };
    })

    return new CardInventory(cardData);
  }
}

export {
  CardInventoryRequest
};