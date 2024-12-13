import i18next from 'i18next';
import { CardAttribute, CardRace, CardType, ORDERED_ATTRIBUTES } from './CardStats';

interface CardTemplate {
  id: number;
  type: CardType;
  atk: number;
  def: number;
  level: number;
  race: CardRace;
  attribute: CardAttribute;
}

function isMonster(card: CardTemplate): boolean {
  return card && !!(card.type & CardType.MONSTER);
}

function isSpell(card: CardTemplate): boolean {
  return card && !!(card.type & CardType.SPELL);
}

function isTrap(card: CardTemplate): boolean {
  return card && !!(card.type & CardType.TRAP);
}

function getCardAttributeIndex(card: CardTemplate): number {
  let index: number;

  if (isSpell(card)) {
    index = ORDERED_ATTRIBUTES.indexOf('spell');
  } else if (isTrap(card)) {
    index = ORDERED_ATTRIBUTES.indexOf('trap');
  } else {
    index = ORDERED_ATTRIBUTES.indexOf(card.attribute);
  }

  return index;
}

function getCardDefinition(card: CardTemplate): string {
  const raceKey: string = CardRace[card.race];

  let definition: string = i18next.t(`cardRace.${raceKey}`);
  let type: string;

  switch (card.type) {
    case CardType.MONSTER:
    case CardType.EFFECT_MONSTER:
      type = i18next.t(`cardType.${CardType[card.type]}`);
      break;
    default: {
      let typeKey: string;

      if ((card.type & CardType.FUSION_MONSTER) === CardType.FUSION_MONSTER) {
        typeKey = CardType[CardType.FUSION_MONSTER];
      } else if ((card.type & CardType.RITUAL_MONSTER) === CardType.RITUAL_MONSTER) {
        typeKey = CardType[CardType.RITUAL_MONSTER];
      } else if ((card.type & CardType.FLIP_EFFECT_MONSTER) === CardType.FLIP_EFFECT_MONSTER) {
        typeKey = CardType[CardType.FLIP_EFFECT_MONSTER];
      } else if ((card.type & CardType.TOON_MONSTER) === CardType.TOON_MONSTER) {
        typeKey = CardType[CardType.TOON_MONSTER];
      } else {
        typeKey = '';
      }

      type = typeKey ? i18next.t(`cardType.${typeKey}`) : typeKey;

      if ((card.type & CardType.EFFECT_MONSTER) === CardType.EFFECT_MONSTER) {
        type += '/' + i18next.t('cardType.EFFECT_MONSTER');
      }
    }
  }

  if (type) {
    definition += '/' + type;
  }

  return `[${definition}]`;
}

function getSpellTrapType(card: CardTemplate): string {
  let type: string;

  switch (card.type) {
    case CardType.EQUIP_SPELL:
      type = 'equip';
      break;
    case CardType.FIELD_SPELL:
      type = 'field';
      break;
    case CardType.RITUAL_SPELL:
      type = 'ritual';
      break;
    case CardType.QUICK_SPELL:
      type = 'quick';
      break;
    case CardType.COUNTER_TRAP:
      type = 'counter';
      break;
    case CardType.CONTINUOUS_SPELL:
    case CardType.CONTINUOUS_TRAP:
      type = 'continuous';
      break;
    default:
      type = null;
      break;
  }

  return type;
}

export {
  CardTemplate,
  isMonster,
  isSpell,
  isTrap,
  getCardAttributeIndex,
  getCardDefinition,
  getSpellTrapType
};