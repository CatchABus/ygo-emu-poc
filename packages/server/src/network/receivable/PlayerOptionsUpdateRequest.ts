import log from 'loglevel';
import { AbstractReceivablePacket } from './AbstractReceivablePacket';

class PlayerOptionsUpdateRequest extends AbstractReceivablePacket {
  private mVolume: number;
  private mForbiddenCardsEnabled: boolean;
  private mFullScreenEnabled: boolean;

  read(): boolean {
    if (this.getBufferSize() !== 6) {
      return false;
    }
    
    this.mVolume = this.readFloat();
    this.mForbiddenCardsEnabled = !!this.readInt8();
    this.mFullScreenEnabled = !!this.readInt8();
    return true;
  }

  async run(): Promise<void> {
    const player = this.client.player;
    if (player == null) {
      return null;
    }

    player.volume = this.mVolume;
    player.forbiddenCardsEnabled = this.mForbiddenCardsEnabled;
    player.fullScreenEnabled = this.mFullScreenEnabled;

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

