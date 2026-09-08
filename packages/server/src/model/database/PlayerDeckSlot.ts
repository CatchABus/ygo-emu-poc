import { BaseEntity, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_deck_slots')
class PlayerDeckSlot extends BaseEntity {
  @PrimaryColumn({ type: 'bigint' })
  deckId: number;

  @PrimaryColumn({ type: 'bigint' })
  cardId: number;

  @PrimaryColumn({ type: 'varchar', length: 25 })
  type: string;
}

export {
  PlayerDeckSlot
};
