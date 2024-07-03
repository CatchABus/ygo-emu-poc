import { CPUDeckData } from '../../data/CPUDeckData';
import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { PlayerCards } from '../sendable/PlayerCards';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerCardsRequest extends AbstractReceivablePacket {
  read(): AbstractSendablePacket {
    const deckIds = CPUDeckData.getInstance().getDecks().get('playerStarter');
    const cardData = deckIds.map((id: number) => {
      return {
        id,
        isNew: id === 3366982
      };
    })

    return new PlayerCards(cardData);
  }
}

export {
  PlayerCardsRequest
};