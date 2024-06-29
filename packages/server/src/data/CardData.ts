import fs from 'fs';
import log from 'loglevel';
import { CardTemplate } from '../template/CardTemplate';
import { AbstractData } from './AbstractData';

class CardData extends AbstractData {
  private readonly _templates: Map<number, CardTemplate> = Object.freeze(new Map());

  private static _instance: CardData;

  public static getInstance(): CardData {
    if (!CardData._instance) {
      CardData._instance = new CardData();
    }
    return CardData._instance;
  }

  public override load(): void {
    try {
      const fileContent = fs.readFileSync('static/cardData.json', 'utf-8');
      const dataset = JSON.parse(fileContent);

      for (const data of dataset) {
        const template = new CardTemplate(data);
        this._templates.set(template.id, template);
      }

      log.info(`Loaded ${this._templates.size} card templates`);
    } catch (err) {
      log.error(err);
    }
  }

  getTemplates(): Map<number, CardTemplate> {
    return this._templates;
  }
}

export {
  CardData
};
