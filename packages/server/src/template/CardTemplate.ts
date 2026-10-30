import { CardAttribute, CardRace, CardType } from './CardStats';


class CardTemplate {
  private readonly mId: number;
  private readonly mType: CardType;
  private readonly mAtk: number;
  private readonly mDef: number;
  private readonly mLevel: number;
  private readonly mRace: CardRace;
  private readonly mAttr: CardAttribute;
  //private readonly mCat: number;
  private mDeckLimit: number;

  constructor(stats: any) {
    this.mId = stats.id;
    this.mType = stats.type;
    this.mAtk = stats.atk;
    this.mDef = stats.def;
    this.mLevel = stats.level;
    this.mRace = stats.race;
    this.mAttr = stats.attribute;
    //this.mCat = stats.category;
  }

  get id(): number {
    return this.mId;
  }

  get type(): CardType {
    return this.mType;
  }

  get atkPoints(): number {
    return this.mAtk;
  }

  get defPoints(): number {
    return this.mDef;
  }

  get level(): number {
    return this.mLevel;
  }

  get race(): CardRace {
    return this.mRace;
  }

  get attribute(): CardAttribute {
    return this.mAttr;
  }

  get isMonster(): boolean {
    return !!(this.type & CardType.MONSTER);
  }

  get deckLimit(): number {
    return this.mDeckLimit;
  }

  set deckLimit(val: number) {
    this.mDeckLimit = val;
  }

  get isFusionMonster(): boolean {
    return (this.type & CardType.FUSION_MONSTER) === CardType.FUSION_MONSTER || (this.type & CardType.FUSION_EFFECT_MONSTER) === CardType.FUSION_EFFECT_MONSTER;
  }
}

export {
  CardTemplate
};