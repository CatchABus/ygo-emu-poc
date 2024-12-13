enum CardAttribute {
  NONE = 0,
  EARTH = 1,
  WATER = 2,
  FIRE = 4,
  WIND = 8,
  LIGHT = 16,
  DARK = 32,
  DIVINE = 64
}

const ORDERED_ATTRIBUTES: Array<CardAttribute | 'spell' | 'trap'> = [
  CardAttribute.LIGHT,
  CardAttribute.DARK,
  CardAttribute.WATER,
  CardAttribute.FIRE,
  CardAttribute.EARTH,
  CardAttribute.WIND,
  CardAttribute.NONE,
  'spell',
  'trap',
  CardAttribute.DIVINE
];

enum CardRace {
  NONE = 0,
  WARRIOR = 1,
  SPELLCASTER = 2,
  FAIRY = 4,
  FIEND = 8,
  ZOMBIE = 16,
  MACHINE = 32,
  AQUA = 64,
  PYRO = 128,
  ROCK = 256,
  WINGED_BEAST = 512,
  PLANT = 1024,
  INSECT = 2048,
  THUNDER = 4096,
  DRAGON = 8192,
  BEAST = 16384,
  BEAST_WARRIOR = 32768,
  DINOSAUR = 65536,
  FISH = 131072,
  SEA_SERPENT = 262144,
  REPTILE = 524288
}

const ORDERED_RACES: CardRace[] = [
  CardRace.DRAGON,
  CardRace.ZOMBIE,
  CardRace.FIEND,
  CardRace.PYRO,
  CardRace.SEA_SERPENT,
  CardRace.ROCK,
  CardRace.MACHINE,
  CardRace.FISH,
  CardRace.DINOSAUR,
  CardRace.INSECT,
  CardRace.BEAST,
  CardRace.BEAST_WARRIOR,
  CardRace.PLANT,
  CardRace.AQUA,
  CardRace.WARRIOR,
  CardRace.WINGED_BEAST,
  CardRace.FAIRY,
  CardRace.SPELLCASTER,
  CardRace.THUNDER,
  CardRace.REPTILE
];

enum CardType {
  SPELL = 2,
  TRAP = 4,
  MONSTER = 17,
  EFFECT_MONSTER = 33,
  FUSION_MONSTER = 65,
  FUSION_EFFECT_MONSTER = 97,
  RITUAL_MONSTER = 129,
  RITUAL_SPELL = 130,
  QUICK_SPELL = 65538,
  CONTINUOUS_SPELL = 131074,
  CONTINUOUS_TRAP = 131076,
  EQUIP_SPELL = 262146,
  FIELD_SPELL = 524290,
  COUNTER_TRAP = 1048580,
  FLIP_EFFECT_MONSTER = 2097185,
  EFFECT_MONSTER_CANNOT_BE_SUMMONED = 33554465,
  TOON_MONSTER = 37748769
}

const ORDERED_CARD_TYPES: CardType[] = [
  CardType.MONSTER,
  CardType.EFFECT_MONSTER,
  CardType.FLIP_EFFECT_MONSTER,
  CardType.EFFECT_MONSTER_CANNOT_BE_SUMMONED,
  CardType.TOON_MONSTER,
  CardType.FUSION_MONSTER,
  CardType.FUSION_EFFECT_MONSTER,
  CardType.RITUAL_MONSTER,
  CardType.SPELL,
  CardType.QUICK_SPELL,
  CardType.EQUIP_SPELL,
  CardType.CONTINUOUS_SPELL,
  CardType.FIELD_SPELL,
  CardType.RITUAL_SPELL,
  CardType.TRAP,
  CardType.COUNTER_TRAP,
  CardType.CONTINUOUS_TRAP
];

export {
  CardAttribute,
  CardRace,
  CardType,
  ORDERED_ATTRIBUTES,
  ORDERED_RACES,
  ORDERED_CARD_TYPES
};