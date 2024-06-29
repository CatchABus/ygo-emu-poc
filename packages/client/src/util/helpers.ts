import i18next from 'i18next';
import { CardTemplate } from '../template/CardTemplate';
import { Text } from 'pixi.js';

function cardNameComparator(a: CardTemplate, b: CardTemplate) {
  const name1 = i18next.t(`cards.${a.id}.name`);
  const name2 = i18next.t(`cards.${b.id}.name`);

  if (name1 < name2) {
    return -1;
  }

  if (name1 > name2) {
    return 1;
  }

  return 0;
}

export {
  cardNameComparator
};