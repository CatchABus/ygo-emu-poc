import { CardAttribute, CardRace, CardType } from './CardStats';


class CardTemplate {
  private _id: number;
  private _type: CardType;
  private _atk: number;
  private _def: number;
  private _level: number;
  private _race: CardRace;
  private _attribute: CardAttribute;
  //private _category: number;

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
}

export {
  CardTemplate
};