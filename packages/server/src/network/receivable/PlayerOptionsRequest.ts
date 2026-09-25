import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';
import { PlayerOptions } from '../sendable/PlayerOptions';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerOptionsRequest extends AbstractReceivablePacket {
  run(): AbstractSendablePacket {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    return new PlayerOptions(player);
  }
}

export {
  PlayerOptionsRequest
};
