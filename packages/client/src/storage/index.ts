import { sound } from '@pixi/sound';

function loadSettings(): void {
  const storedVolumeAll: string = localStorage.getItem('volumeAll');

  sound.volumeAll = storedVolumeAll ? parseFloat(storedVolumeAll) : 0.5;
}

function getItem(key: string) {
  return localStorage.getItem(key);
}

function setItem(key: string, value: string) {
  localStorage.setItem(key, value);
}

function clear(): void {
  localStorage.clear();
}

export default {
  loadSettings,
  getItem,
  setItem,
  clear
};