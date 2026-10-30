import { PlayerDeck } from '../../model/database/PlayerDeck';
import { AbstractSendablePacket, SendableEventName } from './AbstractSendablePacket';

@SendableEventName('playerDeckResponse')
class PlayerDeckResponse extends AbstractSendablePacket {
  private mDeck: PlayerDeck;

  constructor(deck: PlayerDeck) {
    super();
    this.mDeck = deck;
  }

  write(): void {
    const slots = this.mDeck.getSlots();
    const count = slots.length;

    this.writeInt32(this.mDeck.id);
    this.writeInt32(count);

    for (const slot of slots) {
      this.writeInt32(slot.cardId);
      this.writeInt8(slot.type);
    }
  }
}

export {
  PlayerDeckResponse
};
