import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { PlayerDeckResponse } from '../sendable/PlayerDeckResponse';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerDeckRequest extends AbstractReceivablePacket {
  run(): AbstractSendablePacket {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    const curDeck = player.getCurrentDeck();
    if (curDeck == null) {
      return;
    }

    return new PlayerDeckResponse(curDeck);
  }
}

export {
  PlayerDeckRequest
};

