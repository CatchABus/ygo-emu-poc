import { Player } from '../../model/database/Player';
import { AbstractSendablePacket, SendableEventName } from './AbstractSendablePacket';

@SendableEventName('playerOptionsResponse')
class PlayerOptions extends AbstractSendablePacket {
  private mPlayer: Player;

  constructor(player: Player) {
    super();
    this.mPlayer = player;
  }

  write(): void {
    this.writeFloat(this.mPlayer.volume);
    this.writeInt8(Number(this.mPlayer.forbiddenCardsEnabled));
    this.writeInt8(Number(this.mPlayer.fullScreenEnabled));
  }
}

export {
  PlayerOptions
};