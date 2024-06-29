enum CardAttribute {
  NONE = 0,
  EARTH = 1,
  WATER = 2,
  FIRE = 4,
  WIND = 8,
  LIGHT = 16,
  DARK = 32
}

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
  REPTILE = 524288
}

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

// Category (handlings are guessed based on the cards that belong to these categories)
// 536870912 = roll dice
// 0 = no category
// 2 = destroy 1 spell or trap card on the field
// 9 = chain destruction
// 262144 = inflict life point damage
// 524288 = increase life points
// 16384 = monster attack directly
// 1073741824 = take monster control
// 1048576 = special summon monster
// 8192 = inflict piercing damage
// 128 = banish monster
// 32 = return cards to hand
// 131136 = reveal card force activation
// 160 = activate from graveyard???
// 1048608 = monster return to your hand by opponents effect, return monsters to hand, summon the same amount of monsters
// 131072 = negate cards
// 1052672 = change monster battle position
// 9437184 = special summon fusion monster or materials
// 1 = destroy monster
// 32768 = can make a second attack
// 1048584 = random select from hand??
// 64 = return 1 card to the bottom of deck????
// 1572864 = special summon any number of the same monster????
// 9437192 = fusion
// 262146 = destroy field spells????
// 1073741825 = give monster control????
// 544 = add card from deck to hand
// 262272 = randomly select cards from hand?????
// 1310720 = special summon automatically????
// 8388736 = fusion summon every turn????
// 196608 = negate monster effects????
// 2097152 = add non-effect monsters to hand????
// 536871168 = gamble????
// 4096 = change to defense position
// 1064960 = toon monster
// 256 = draw cards
// 131074 = negate card effect, destroy all spells and traps????
// 65538 = discard 1 card to negate this card's effect????
// 262176 = use opponent card from hand????
// 69632 = change card to defense and negate activation????
// 537133057 = toss coin, destroy opponent monsters, destroy your monsters????
// 262312 = shuffle all monsters from the field to the deck????
// 1048577 = special summon decoys during opponent battle phase????
// 2359296 = special summon from deck in attack position????

export {
  CardAttribute,
  CardRace,
  CardType
};