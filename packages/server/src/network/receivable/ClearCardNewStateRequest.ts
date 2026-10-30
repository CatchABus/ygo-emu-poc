import * as log from 'loglevel';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class ClearCardNewStateRequest extends AbstractReceivablePacket {
  private mCardId: number;

  read(): boolean {
    if (this.getBufferSize() !== 4) {
      return false;
    }
    
    this.mCardId = this.readInt32();
    return true;
  }

  async run(): Promise<void> {
    if (this.mCardId < 1) {
      return;
    }

    const player = this.client.player;
    if (player == null) {
      return;
    }

    const cards = player.getAllCards();

    if (cards.has(this.mCardId)) {
      const card = cards.get(this.mCardId);

      if (!card.isNew) {
        log.warn(`Client ${this.client.getAccountName()} attempted to clear new state for an old card! Card ID: ${this.mCardId}`);
        return;
      }

      card.isNew = false;

      try {
        await card.save();
      } catch (err) {
        log.error(err);
      }

      log.debug(`New card ${this.mCardId} has become stale`);
    } else {
      log.warn(`Client ${this.client.getAccountName()} attempted to clear new state for a card ID that doesn't own!`);
    }
  }
}

export {
  ClearCardNewStateRequest
};

