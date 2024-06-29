import fs from 'fs';
import readline from 'readline';
import sharp from 'sharp';

const MSG = 'Downloading card files';
const FILE_EXTENSION = process.env.YGO_CARD_API_FILE_EXTENSION;
const DEST_PATH = '../client/raw-assets/cards{m}/images';

const WIDTH = parseFloat(process.env.YGO_CARD_EXPORT_WIDTH);
const HEIGHT = parseFloat(process.env.YGO_CARD_EXPORT_HEIGHT);

async function start(): Promise<void> {
  const joeyCardIds = JSON.parse(fs.readFileSync('static/joeyCardIds.json', {
    encoding: 'utf8'
  }));
  const totalCount = joeyCardIds.length;

  let counter = 0;

  process.stdout.write(`${MSG} (0/${totalCount})`);

  for (const id of joeyCardIds) {
    // Perform an http request to fetch card image binary
    const response = await fetch(`${process.env.YGO_CARD_API_URL}/${id}.${FILE_EXTENSION}`);
    const cardBuffer = await response.arrayBuffer();

    // Convert image and save it to client
    await sharp(cardBuffer).png().resize(WIDTH, HEIGHT).toFile(`${DEST_PATH}/${id}.png`);

    counter++;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${MSG} (${counter}/${totalCount})`);
  }

  console.log();
  console.log(`Card images were successfully downloaded and stored into '${DEST_PATH}'!`);
}

export {
  start
};
