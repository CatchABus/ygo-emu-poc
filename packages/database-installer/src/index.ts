import inquirer from 'inquirer';
import * as DatabaseManager from './DatabaseManager';

console.info('================================================');
console.info('== Welcome to ygo-poc-web database installer! ==');
console.info('================================================');

(async function () {
  const choices = ['Database setup', 'Truncate tables', 'Delete database'];

  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Please choose one of the options:',
        choices: [...choices, new inquirer.Separator()]
      }
    ]);

    const choiceIndex = choices.indexOf(answers.choice);

    switch (choiceIndex) {
      case 0:
        DatabaseManager.installDatabase();
        break;
      case 1:
        DatabaseManager.truncateTables();
        break;
      case 2:
        DatabaseManager.deleteDatabase();
        break;
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})()