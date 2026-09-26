import { PlayerCard } from '../../model/database/PlayerCard';
import { AbstractSendablePacket, SendableEventName } from './AbstractSendablePacket';

@SendableEventName('cardListResponse')
class CardList extends AbstractSendablePacket {
  private _cards: Map<number, PlayerCard>;

  constructor(cards: Map<number, PlayerCard>) {
    super();
    this._cards = cards;
  }

  write(): void {
    this.writeInt32(this._cards.size);

    for (const [, card] of this._cards) {
      this.writeInt32(card.id);
      this.writeInt32(card.templateId);
      this.writeInt8(Number(card.isNew));
    }
  }
}

export {
  CardList
};