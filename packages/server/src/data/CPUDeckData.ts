import fs from 'fs';
import log from 'loglevel';
import { AbstractData } from './AbstractData';

const FOLDER_PATH = 'static/decks';
const FILE_EXT = '.deck.json';

let instance: CPUDeckDataImpl = null;

class CPUDeckDataImpl extends AbstractData {
  private readonly _decks: Map<string, number[]> = Object.freeze(new Map());

  public override load(): void {
    try {
      const fileNames = fs.readdirSync(FOLDER_PATH).filter(fileName => fileName.endsWith(FILE_EXT));

      for (const fileName of fileNames) {
        const extIndex = fileName.indexOf(FILE_EXT);
        const isDeckFile = extIndex === (fileName.length - FILE_EXT.length);

        if (isDeckFile) {
          const content = fs.readFileSync(`${FOLDER_PATH}/${fileName}`, 'utf8');
          this._decks.set(fileName.substring(0, extIndex), Object.freeze(JSON.parse(content)));
        }
      }

      log.info(`Loaded ${this._decks.size} CPU decks`);
    } catch (err) {
      log.error(err);
    }
  }

  public getDecks(): Map<string, number[]> {
    return this._decks;
  }
}

export const CPUDeckData = {
  getInstance(): CPUDeckDataImpl {
    if (instance == null) {
      instance = new CPUDeckDataImpl();
    }

    return instance;
  }
};