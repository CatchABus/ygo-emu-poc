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

  @Column({ type: 'boolean', default: false })
  isEquipped: boolean;

  public static DEFAULT_DECK_NAME = 'default';

  private _owner: Player;

  private readonly _slots: PlayerDeckSlot[] = [];
  private readonly _extraSlots: PlayerDeckSlot[] = [];
  private readonly _fusionSlots: PlayerDeckSlot[] = [];

  public async createSlot(card: PlayerCard, type: DeckType): Promise<void> {
    try {
      const deckSlot = new PlayerDeckSlot();

      deckSlot.deckId = this.id;
      deckSlot.cardId = card.id;
      deckSlot.type = type;
      await deckSlot.save();
    } catch (err) {
      log.error(err);
    }
  }

  public async restore(): Promise<void> {
    await this._restoreSlots();
  }

  private _appendSlot(slot: PlayerDeckSlot): void {
    switch (slot.type) {
      case DeckType.NORMAL:
        this._slots.push(slot);
        break;
      case DeckType.EXTRA:
        this._extraSlots.push(slot);
        break;
      case DeckType.FUSION:
        this._fusionSlots.push(slot);
        break;
      default:
        log.warn(`Invalid deck slot type ${slot.type} for card ${slot.cardId} in deck ${this.id}`);
        break;
    }
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
          this._appendSlot(slot);
        } else {
          log.warn(`Deck ${this.id} that belongs to player ${this.owner.id} contains a card ID without ownership: ${slot.cardId}`);
        }
      }
    } catch (err) {
      log.error(err);
    }
  }

  get owner(): Player {
    return this._owner;
  }

  set owner(val: Player) {
    this._owner = val;
  }

  get slots(): PlayerDeckSlot[] {
    return this._slots;
  }

  get extraSlots(): PlayerDeckSlot[] {
    return this._extraSlots;
  }

  get fusionSlots(): PlayerDeckSlot[] {
    return this._fusionSlots;
  }
}

export {
  PlayerDeck
};
