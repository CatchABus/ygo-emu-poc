import { Application } from 'pixi.js';

let _application: Application = null;
let _gameMode: GameMode = 'joey'; // Default

function getApplication(): Application {
  if (_application == null) {
    throw new Error('Application is not initialized!');
  }
  return _application;
}

function isApplicationStarted(): boolean {
  return _application != null;
}

function setApplication(app: Application): void {
  if (_application != null) {
    throw new Error('Application is already initialized!');
  }
  _application = app;
}

function getGameMode(): string {
  return _gameMode;
}

function setGameMode(val: GameMode): void {
  _gameMode = val;
}

export {
  getApplication,
  isApplicationStarted,
  setApplication,
  getGameMode,
  setGameMode
};