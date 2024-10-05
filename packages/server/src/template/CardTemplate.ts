import { CardAttribute, CardRace, CardType } from './CardStats';


class CardTemplate {
  private readonly _id: number;
  private readonly _type: CardType;
  private readonly _atk: number;
  private readonly _def: number;
  private readonly _level: number;
  private readonly _race: CardRace;
  private readonly _attribute: CardAttribute;
  //private readonly _category: number;
  private _deckLimit: number;

  constructor(stats: any) {
    this._id = stats.id;
    this._type = stats.type;
    this._atk = stats.atk;
    this._def = stats.def;
    this._level = stats.level;
    this._race = stats.race;
    this._attribute = stats.attribute;
    //this._category = stats.category;
  }

  get id(): number {
    return this._id;
  }

  get type(): CardType {
    return this._type;
  }

  get atkPoints(): number {
    return this._atk;
  }

  get defPoints(): number {
    return this._def;
  }

  get level(): number {
    return this._level;
  }

  get race(): CardRace {
    return this._race;
  }

  get attribute(): CardAttribute {
    return this._attribute;
  }

  get isMonster(): boolean {
    return !!(this.type & CardType.MONSTER);
  }

  get deckLimit(): number {
    return this._deckLimit;
  }

  set deckLimit(val: number) {
    this._deckLimit = val;
  }

  get isFusionMonster(): boolean {
    return (this.type & CardType.FUSION_MONSTER) === CardType.FUSION_MONSTER || (this.type & CardType.FUSION_EFFECT_MONSTER) === CardType.FUSION_EFFECT_MONSTER;
  }
}

export {
  CardTemplate
};