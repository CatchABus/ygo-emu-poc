import { PlayerCard } from '../../model/database/PlayerCard';
import { AbstractSendablePacket } from './AbstractSendablePacket';

class CardInventory extends AbstractSendablePacket {
  private _cards: Map<number, PlayerCard>;

  constructor(cards: Map<number, PlayerCard>) {
    super();
    this._cards = cards;
  }

  getEventName(): any {
    return 'cardInventoryResponse';
  }

  write(): void {
    this.writeInt32(this._cards.size);

    for (const [, card] of this._cards) {
      this.writeInt32(card.id);
      this.writeInt32(card.templateId);
      this.writeInt8(card.isNew ? 1 : 0);
      this.writeInt32(card.count);
      this.writeInt8(card.template?.deckLimit ?? -1);
    }
  }
}

export {
  CardInventory
};