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
    this.writeInt8(this._player.fullScreenEnabled ? 1 : 0);
    this.writeInt8(this._player.forbiddenCardsEnabled ? 1 : 0);
  }
}

export {
  PlayerOptions
};