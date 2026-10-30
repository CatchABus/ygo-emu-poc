import { PlayerCard } from '../../model/database/PlayerCard';
import { AbstractSendablePacket, SendableEventName } from './AbstractSendablePacket';

@SendableEventName('cardInventoryResponse')
class CardInventory extends AbstractSendablePacket {
  private mCards: Map<number, PlayerCard>;

  constructor(cards: Map<number, PlayerCard>) {
    super();
    this.mCards = cards;
  }

  write(): void {
    this.writeInt32(this.mCards.size);

    for (const [, card] of this.mCards) {
      this.writeInt32(card.templateId);
      this.writeInt8(Number(card.isNew));
      this.writeInt32(card.count);
      this.writeInt8(card.template?.deckLimit ?? -1);
    }
  }
}

export {
  CardInventory
};