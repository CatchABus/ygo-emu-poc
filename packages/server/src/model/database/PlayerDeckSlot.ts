import { BaseEntity, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_deck_slots')
class PlayerDeckSlot extends BaseEntity {
  @PrimaryColumn({ type: 'bigint' })
  deckId: number;

  @PrimaryColumn({ type: 'bigint' })
  cardId: number;

  @PrimaryColumn({ type: 'tinyint', unsigned: true })
  type: number;
}

export {
  PlayerDeckSlot
};
