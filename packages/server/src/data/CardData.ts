import fs from 'fs';
import log from 'loglevel';
import { CardTemplate } from '../template/CardTemplate';
import { AbstractData } from './AbstractData';

const DIR = 'static';

let instance: CardDataImpl = null;

class CardDataImpl extends AbstractData {
  private readonly _templates: Map<number, CardTemplate>;
  private readonly _deckCardLimits: Map<number, number>;

  constructor() {
    super();

    this._templates = new Map();
    this._deckCardLimits = new Map();
  }

  public override load(): void {
    try {
      const fileContent = fs.readFileSync(`${DIR}/cardData.json`, 'utf-8');
      const cardDataset = JSON.parse(fileContent);

      for (const data of cardDataset) {
        const template = new CardTemplate(data);
        this._templates.set(template.id, template);
      }
    } catch (err) {
      log.error(err);
    }

    try {
      const fileContent = fs.readFileSync(`${DIR}/limitedCardData.json`, 'utf-8');
      const deckCardLimitData: Array<{ id: number, deckLimit: number }> = JSON.parse(fileContent);

      for (const data of deckCardLimitData) {
        const template = this._templates.has(data.id) ? this._templates.get(data.id) : null;
        if (template != null) {
          template.deckLimit = data.deckLimit;
        }
      }
    } catch (err) {
      log.error(err);
    }

    log.info(`Loaded ${this._templates.size} card templates`);
    log.info(`Loaded ${this._deckCardLimits.size} forbidden card limits`);
  }

  getTemplates(): Array<[number, CardTemplate]> {
    return Array.from(this._templates);
  }

  getTemplateById(id: number): CardTemplate {
    return this._templates.get(id);
  }

  getDeckCardLimit(id: number): number {
    return this._deckCardLimits.has(id) ? this._deckCardLimits.get(id) : -1;
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