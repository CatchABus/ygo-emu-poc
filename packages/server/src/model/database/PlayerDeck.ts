import * as log from 'loglevel';
import { PlayerCard } from './PlayerCard';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Player } from './Player';
import { PlayerDeckSlot } from './PlayerDeckSlot';
import { DeckType } from '../../template/DeckType';

@Entity('player_decks')
class PlayerDeck extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'bigint' })
  playerId: number;

  public static DEFAULT_DECK_NAME = 'default';

  private mOwner: Player;

  private readonly mSlots: PlayerDeckSlot[] = [];

  public async createSlot(card: PlayerCard, type: DeckType): Promise<void> {
    try {
      const deckSlot = new PlayerDeckSlot();

      deckSlot.deckId = this.id;
      deckSlot.cardId = card.templateId;
      deckSlot.type = type;
      await deckSlot.save();
    } catch (err) {
      log.error(err);
    }
  }

  public async restore(): Promise<void> {
    await this._restoreSlots();
  }

  private async _restoreSlots(): Promise<void> {
    if (this.owner == null) {
      return;
    }

    const cards = this.owner.getAllCards();

    try {
      const deckSlots = await PlayerDeckSlot.findBy({
        deckId: this.id
      });

      for (const slot of deckSlots) {
        if (cards.has(slot.cardId)) {
          this.mSlots.push(slot);
        } else {
          log.warn(`Deck ${this.id} that belongs to player ${this.owner.id} contains a card ID without ownership: ${slot.cardId}`);
        }
      }
    } catch (err) {
      log.error(err);
    }
  }

  get owner(): Player {
    return this.mOwner;
  }

  set owner(val: Player) {
    this.mOwner = val;
  }

  getSlots(): PlayerDeckSlot[] {
    return this.mSlots;
  }
}

export {
  PlayerDeck
};
