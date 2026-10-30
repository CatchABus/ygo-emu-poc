import fs from 'fs';
import * as log from 'loglevel';
import { CardTemplate } from '../template/CardTemplate';
import { AbstractData } from './AbstractData';

const DIR = 'static';

let instance: CardDataImpl = null;

class CardDataImpl extends AbstractData {
  private readonly mTemplates: Map<number, CardTemplate>;
  private readonly mDeckCardLimits: Map<number, number>;

  constructor() {
    super();

    this.mTemplates = new Map();
    this.mDeckCardLimits = new Map();
  }

  public override load(): void {
    try {
      const fileContent = fs.readFileSync(`${DIR}/cardData.json`, 'utf-8');
      const cardDataset = JSON.parse(fileContent);

      for (const data of cardDataset) {
        const template = new CardTemplate(data);
        this.mTemplates.set(template.id, template);
      }
    } catch (err) {
      log.error(err);
    }

    try {
      const fileContent = fs.readFileSync(`${DIR}/limitedCardData.json`, 'utf-8');
      const deckCardLimitData: Array<{ id: number, deckLimit: number }> = JSON.parse(fileContent);

      for (const data of deckCardLimitData) {
        const template = this.mTemplates.has(data.id) ? this.mTemplates.get(data.id) : null;
        if (template != null) {
          template.deckLimit = data.deckLimit;
        }
      }
    } catch (err) {
      log.error(err);
    }

    log.info(`Loaded ${this.mTemplates.size} card templates`);
    log.info(`Loaded ${this.mDeckCardLimits.size} forbidden card limits`);
  }

  getTemplates(): Array<[number, CardTemplate]> {
    return Array.from(this.mTemplates);
  }

  getTemplateById(id: number): CardTemplate {
    return this.mTemplates.get(id);
  }

  getDeckCardLimit(id: number): number {
    return this.mDeckCardLimits.has(id) ? this.mDeckCardLimits.get(id) : -1;
  }
}

export const CardData = {
  getInstance(): CardDataImpl {
    if (instance == null) {
      instance = new CardDataImpl();
    }

    return instance;
  }
};