import log from 'loglevel';
import { PlayerCard } from '../../model/database/PlayerCard';
import { AbstractReceivablePacket, PacketEventName } from './AbstractReceivablePacket';

@PacketEventName('playerNewCardAction')
class PlayerNewCardAction extends AbstractReceivablePacket {
  async read(): Promise<void> {
    const cardId = this.readInt32();

    try {
      const card = await PlayerCard.find<PlayerCard>(cardId);
      if (card != null) {
        card.isNew = 0;
        await card.save();

        log.info(`New card ${cardId} has become stale`);
      }
    } catch (err) {
      log.error(err);
    }
  }
}

export {
  PlayerNewCardAction
};

