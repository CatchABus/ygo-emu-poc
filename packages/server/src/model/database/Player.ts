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

  @Column({ type: 'smallint', default: 0 })
  curDeckIndex: number;

  @Column({ type: 'decimal', precision: 4, scale: 3, default: 0.5 })
  volume: number;

  @Column({ type: 'boolean', default: false })
  forbiddenCardsEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  fullScreenEnabled: boolean;

  @OneToOne(() => Account, {
    lazy: true
  })
  account: Promise<Account>;

  private readonly mCards = new Map<number, PlayerCard>();
  private readonly mDecks: PlayerDeck[] = [];

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

        this.mCards.set(card.templateId, card);
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
      await deck.save();

      // Create deck slots
      for (const [, card] of this.mCards) {
        await deck.createSlot(card, card.template.isFusionMonster ? DeckType.FUSION : DeckType.NORMAL);
      }

      deck.owner = this;
      this.mDecks.push(deck);

      await this.save();

      if (this.curDeckIndex !== 0) {
        log.warn(`Incorrect active deck index '${this.curDeckIndex} for player '${this.id}'`);
      }
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
          this.mCards.set(card.templateId, card);
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
      const decks = await PlayerDeck.find<PlayerDeck>({
        where: {
          playerId: this.id
        },
        order: {
          id: 'DESC',
        }
      });
      const decksLen = decks.length;

      if (decksLen > 0) {
        for (let i = 0; i < decksLen; i++) {
          const deck = decks[i];

          deck.owner = this;
          deck.restore();

          this.mDecks.push(deck);
        }

        if (decksLen <= this.curDeckIndex) {
          log.warn(`Could not find any deck at index '${this.curDeckIndex} for player '${this.id}'. Switching to first deck...`);
          this.curDeckIndex = 0;
        }
      } else {
        await this._createStarterDeck();
      }
    } catch (err) {
      log.error(err);
    }
  }

  getAllCards(): Map<number, PlayerCard> {
    return this.mCards;
  }

  getCurrentDeck(): PlayerDeck {
    return this.mDecks[this.curDeckIndex];
  }

  getDecks(): PlayerDeck[] {
    return this.mDecks;
  }
}

export {
  Player
};
