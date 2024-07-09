import * as fs from 'fs';

fs.cpSync('./.env', './dist/.env');
fs.cpSync('./package.json', './dist/package.json');
fs.cpSync('./static', './dist/static', {
  recursive: true
});