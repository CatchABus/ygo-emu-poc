import { CPUDeckData } from '../../data/CPUDeckData';
import { PlayerCards } from '../sendable/PlayerCards';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerCardsRequest extends AbstractReceivablePacket<Buffer> {
  read(): Buffer {
    const deckIds = CPUDeckData.getInstance().getDecks().get('playerStarter');
    const cardData = deckIds.map((id: number) => {
      return {
        id,
        isNew: id === 3366982
      };
    })

    return this.client.getPacketContent(new PlayerCards(cardData));
  }
}

export {
  PlayerCardsRequest
};