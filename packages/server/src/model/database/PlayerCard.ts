import { AfterInsert, AfterLoad, AfterUpdate, BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { CardData } from '../../data/CardData';
import { CardTemplate } from '../../template/CardTemplate';

@Entity('player_cards')
@Index(['playerId', 'templateId'], { unique: true })
class PlayerCard extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bigint' })
  playerId: number;

  @Column({ type: 'bigint' })
  templateId: number;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ type: 'boolean', default: false })
  isNew: boolean;

  private _template: CardTemplate;

  @AfterInsert()
  onCreate(): void {
    this._template = CardData.getInstance().getTemplateById(this.templateId);
  }

  @AfterLoad()
  onRestore(): void {
    this._template = CardData.getInstance().getTemplateById(this.templateId);
  }

  @AfterUpdate()
  onUpdate(): void {
    if (this._template != null && this._template.id !== this.templateId) {
      this._template = CardData.getInstance().getTemplateById(this.templateId);
    }
  }

  get template(): CardTemplate {
    return this._template;
  }
}

export {
  PlayerCard
};
