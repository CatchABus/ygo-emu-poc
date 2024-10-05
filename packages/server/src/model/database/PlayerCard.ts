import { CardData } from '../../data/CardData';
import { CardTemplate } from '../../template/CardTemplate';
import { BaseModel, DatabaseSchema, TinyInt } from './BaseModel';

@DatabaseSchema('player_cards', [
  'playerId',
  'templateId',
  'count',
  'isNew'
])
class PlayerCard extends BaseModel {
  declare playerId: number;
  declare templateId: number;
  declare count: number;
  declare isNew: TinyInt;

  private _template: CardTemplate;

  override onCreate(): void {
    this._template = CardData.getInstance().getTemplateById(this.templateId);
  }

  override onRestore(): void {
    this._template = CardData.getInstance().getTemplateById(this.templateId);
  }

  override onUpdate(): void {
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
