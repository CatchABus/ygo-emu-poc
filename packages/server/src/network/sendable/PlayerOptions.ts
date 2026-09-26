import { Player } from '../../model/database/Player';
import { AbstractSendablePacket, SendableEventName } from './AbstractSendablePacket';

@SendableEventName('playerOptionsResponse')
class PlayerOptions extends AbstractSendablePacket {
  private _player: Player;

  constructor(player: Player) {
    super();
    this._player = player;
  }

  write(): void {
    this.writeFloat(this._player.volume);
    this.writeInt8(Number(this._player.forbiddenCardsEnabled));
    this.writeInt8(Number(this._player.fullScreenEnabled));
  }
}

export {
  PlayerOptions
};