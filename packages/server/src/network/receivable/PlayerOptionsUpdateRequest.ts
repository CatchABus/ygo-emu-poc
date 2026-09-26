import log from 'loglevel';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerOptionsUpdateRequest extends AbstractReceivablePacket {
  private _volume: number;
  private _forbiddenCardsEnabled: boolean;
  private _fullScreenEnabled: boolean;

  read(): boolean {
    if (this.getBufferSize() !== 6) {
      return false;
    }
    
    this._volume = this.readFloat();
    this._forbiddenCardsEnabled = !!this.readInt8();
    this._fullScreenEnabled = !!this.readInt8();
    return true;
  }

  async run(): Promise<void> {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    player.volume = this._volume;
    player.forbiddenCardsEnabled = this._forbiddenCardsEnabled;
    player.fullScreenEnabled = this._fullScreenEnabled;

    try {
      await player.save();
    } catch (err) {
      log.error(err);
    }

    log.debug(`Player options have been updated to volume=${player.volume},forbiddenCardsEnabled=${player.forbiddenCardsEnabled},fullScreenEnabled=${player.fullScreenEnabled}`);
  }
}

export {
  PlayerOptionsUpdateRequest
};

