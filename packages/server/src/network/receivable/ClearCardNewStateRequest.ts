import log from 'loglevel';
import { AbstractReceivablePacket, PacketEventName } from './AbstractReceivablePacket';

@PacketEventName('clearCardNewStateRequest')
class ClearCardNewStateRequest extends AbstractReceivablePacket {
  async read(): Promise<void> {
    const cardId = this.readInt32();

    const player = this.client.player;
    if (player == null) {
      return;
    }

    const cards = player.getAllCards();

    if (cards.has(cardId)) {
      const card = cards.get(cardId);

      if (card.isNew === 0) {
        log.warn(`Client ${this.client.accountName} attempted to clear new state for an old card! Card: ${cardId}`);
        return;
      }

      card.isNew = 0;

      try {
        await card.save();
      } catch (err) {
        log.error(err);
      }

      log.debug(`New card ${cardId} has become stale`);
    } else {
      log.warn(`Client ${this.client.accountName} attempted to clear new state for a card ID that doesn't own!`);
    }
  }
}

export {
  ClearCardNewStateRequest
};

