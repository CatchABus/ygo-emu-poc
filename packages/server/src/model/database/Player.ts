import * as log from 'loglevel';
import { CPUDeckData } from '../../data/CPUDeckData';
import { PlayerDeck } from './PlayerDeck';
import { AfterInsert, BaseEntity, Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerCard } from './PlayerCard';
import { DeckType } from '../../template/DeckType';
import { Account } from './Account';

@Entity('players')
class Player extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bigint', unique: true })
  accountId: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1 })
  volume: number;

  @Column({ type: 'boolean', default: false })
  forbiddenCardsEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  fullScreenEnabled: boolean;

  @OneToOne(() => Account, {
    lazy: true
  })
  account: Promise<Account>;

  private _currentDeck: PlayerDeck;

  private readonly _cards = new Map<number, PlayerCard>();
  private readonly _decks = new Map<string, PlayerDeck>();

  static async restoreOrCreate(accountId: number): Promise<Player> {
    let player: Player;

    try {
      player = await Player.findOneBy({
        accountId
      });

      if (player != null) {
        await player.restore();
      } else {
        player = new Player();
        player.accountId = accountId;
        await player.save();
      }
    } catch (err) {
      log.error(err);
      player = null;
    }

    return player;
  }

  public async restore(): Promise<void> {
    await this._restoreCards();
    await this._restoreDecks();
  }

  @AfterInsert()
  async onCreate(): Promise<void> {
    await this._createStarterCards();
    await this._createStarterDeck();
  }

  private async _createStarterCards(): Promise<void> {
    try {
      const cardTemplateIds = CPUDeckData.getInstance().getDecks().get('playerStarter');

      for (const templateId of cardTemplateIds) {
        const card = new PlayerCard();
        card.templateId = templateId;
        card.playerId = this.id;
        card.count = 1;
        card.isNew = false;

        await card.save();

        this._cards.set(card.id, card);
      }
    } catch (err) {
      log.error(err);
    }
  }

  private async _createStarterDeck(): Promise<void> {
    try {
      // Create starter deck
      const deck = new PlayerDeck();
      deck.name = PlayerDeck.DEFAULT_DECK_NAME;
      deck.playerId = this.id;
      // Set deck to be player's current deck
      deck.isEquipped = true;
      await deck.save();

      // Create deck slots
      for (const [, card] of this._cards) {
        await deck.createSlot(card, card.template.isFusionMonster ? DeckType.FUSION : DeckType.NORMAL);
      }

      deck.owner = this;
      this._decks.set(deck.name, deck);

      await this.save();

      this._currentDeck = deck;
    } catch (err) {
      log.error(err);
    }
  }

  private async _restoreCards(): Promise<void> {
    try {
      const cards = await PlayerCard.findBy({
        playerId: this.id
      });

      if (cards.length) {
        for (const card of cards) {
          this._cards.set(card.id, card);
        }
      } else {
        await this._createStarterCards();
      }
    } catch (err) {
      log.error(err);
    }
  }

  private async _restoreDecks(): Promise<void> {
    try {
      const decks = await PlayerDeck.findBy<PlayerDeck>({
        playerId: this.id
      });

      if (decks.length) {
        for (const deck of decks) {
          deck.owner = this;
          deck.restore();

          this._decks.set(deck.name, deck);

          // Set current deck
          if (deck.isEquipped) {
            this._currentDeck = deck;
          }
        }
      } else {
        await this._createStarterDeck();
      }
    } catch (err) {
      log.error(err);
    }
  }

  getAllCards(): Map<number, PlayerCard> {
    return this._cards;
  }

  get currentDeck(): PlayerDeck {
    return this._currentDeck;
  }

  get decks(): Map<string, PlayerDeck> {
    return this._decks;
  }
}

export {
  Player
};
