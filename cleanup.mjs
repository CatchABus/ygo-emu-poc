import * as fs from 'fs';

try {
  fs.unlinkSync('./package-lock.json');
} catch (err) { /* empty */ }

try {
  fs.rmSync('./node_modules', {
    recursive: true,
    force: true
  });
} catch (err) { /* empty */ }