import log from 'loglevel';
import { BaseModel, DatabaseSchema } from './BaseModel';
import { PlayerCard } from './PlayerCard';
import { DatabaseSource } from '../../databaseSource';
import { Player } from './Player';
import { RowDataPacket } from 'mysql2';

enum DeckType {
  NORMAL,
  EXTRA,
  FUSION
}

interface DeckSlot {
  card: PlayerCard;
  type: DeckType;
}

const SLOTS_TABLE = 'player_deck_slots';

@DatabaseSchema('player_decks', [
  'name',
  'playerId'
])
class PlayerDeck extends BaseModel {
  declare name: string;
  declare playerId: number;

  private _owner: Player;

  private readonly _slots: DeckSlot[] = [];
  private readonly _extraSlots: DeckSlot[] = [];
  private readonly _fusionSlots: DeckSlot[] = [];

  public async createSlot(card: PlayerCard, type: DeckType): Promise<void> {
    try {
      const pool = DatabaseSource.getInstance().getPool();

      await pool.execute(`INSERT INTO ${SLOTS_TABLE} VALUES (?,?,?)`, [this.id, card.id, DeckType[type]]);

      this._appendSlot({
        card,
        type
      });
    } catch (err) {
      log.error(err);
    }
  }

  public async restore(): Promise<void> {
    await this._restoreSlots();
  }

  private _appendSlot(slot: DeckSlot): void {
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
        log.warn(`Invalid deck slot type ${slot.type} for card ${slot.card.id} in deck ${this.id}`);
        break;
    }
  }

  private async _restoreSlots(): Promise<void> {
    if (this.owner == null) {
      return;
    }

    const cards = this.owner.getAllCards();

    try {
      const pool = DatabaseSource.getInstance().getPool();
      const [ rows ] = await pool.execute<RowDataPacket[]>(`SELECT cardId, type FROM ${SLOTS_TABLE} WHERE deckId = ?`, [this.id]);

      for (const row of rows) {
        if (cards.has(row.cardId)) {
          const card: PlayerCard = cards.get(row.cardId);

          this._appendSlot({
            card,
            type: DeckType[row.type as keyof typeof DeckType]
          });
        } else {
          log.warn(`Deck ${this.id} that belongs to player ${this.owner.id} contains a card ID without ownership: ${row.id}`);
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

  get slots(): DeckSlot[] {
    return this._slots;
  }

  get extraSlots(): DeckSlot[] {
    return this._extraSlots;
  }

  get fusionSlots(): DeckSlot[] {
    return this._fusionSlots;
  }
}

export {
  DeckType,
  DeckSlot,
  PlayerDeck
};
