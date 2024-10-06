import log from 'loglevel';
import { AbstractReceivablePacket, PacketEventName } from './AbstractReceivablePacket';

@PacketEventName('clearCardNewStateRequest')
class ClearCardNewStateRequest extends AbstractReceivablePacket {
  private _cardId: number;

  read(): boolean {
    if (this.getBufferSize() !== 4) {
      return false;
    }
    
    this._cardId = this.readInt32();
    return true;
  }

  async run(): Promise<void> {
    if (this._cardId < 1) {
      return;
    }

    const player = this.client.player;
    if (player == null) {
      return;
    }

    const cards = player.getAllCards();

    if (cards.has(this._cardId)) {
      const card = cards.get(this._cardId);

      if (card.isNew === 0) {
        log.warn(`Client ${this.client.accountName} attempted to clear new state for an old card! Card ID: ${this._cardId}`);
        return;
      }

      card.isNew = 0;

      try {
        await card.save();
      } catch (err) {
        log.error(err);
      }

      log.debug(`New card ${this._cardId} has become stale`);
    } else {
      log.warn(`Client ${this.client.accountName} attempted to clear new state for a card ID that doesn't own!`);
    }
  }
}

export {
  ClearCardNewStateRequest
};

