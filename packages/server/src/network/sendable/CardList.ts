import { AbstractSendablePacket } from './AbstractSendablePacket';

interface CardInfo {
  id: number;
  isNew: boolean;
}

class CardList extends AbstractSendablePacket {
  private _playerCards: CardInfo[];

  constructor(cards: CardInfo[]) {
    super();
    this._playerCards = cards;
  }

  getEventName(): any {
    return 'cardListResponse';
  }

  write(): void {
    this.writeInt32(this._playerCards.length);

    for (const card of this._playerCards) {
      this.writeInt32(card.id);
      this.writeInt8(card.isNew ? 1 : 0);
    }
  }
}

export {
  CardList
};