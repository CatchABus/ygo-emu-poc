import { AfterInsert, AfterLoad, AfterUpdate, BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
import { CardData } from '../../data/CardData';
import { CardTemplate } from '../../template/CardTemplate';

@Entity('player_cards')
class PlayerCard extends BaseEntity {
  @PrimaryColumn({ type: 'bigint' })
  playerId: number;

  @PrimaryColumn({ type: 'bigint' })
  templateId: number;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ type: 'boolean', default: false })
  isNew: boolean;

  private mTmpl: CardTemplate;

  @AfterInsert()
  onCreate(): void {
    this.mTmpl = CardData.getInstance().getTemplateById(this.templateId);
  }

  @AfterLoad()
  onRestore(): void {
    this.mTmpl = CardData.getInstance().getTemplateById(this.templateId);
  }

  @AfterUpdate()
  onUpdate(): void {
    if (this.mTmpl != null && this.mTmpl.id !== this.templateId) {
      this.mTmpl = CardData.getInstance().getTemplateById(this.templateId);
    }
  }

  get template(): CardTemplate {
    return this.mTmpl;
  }
}

export {
  PlayerCard
};

