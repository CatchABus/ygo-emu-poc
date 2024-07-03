import log from 'loglevel';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerNewCardAction extends AbstractReceivablePacket {
  read(): void {
    const cardId = this.readInt32();

    log.info(`Card ${cardId} is no longer new`);
  }
}

export {
  PlayerNewCardAction
};
