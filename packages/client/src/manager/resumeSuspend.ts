const onVisibilityChange = () => {
  Howler.mute(document.hidden);
};

function addSuspendListener(): void {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

export {
  addSuspendListener
};