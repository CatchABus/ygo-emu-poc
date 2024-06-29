import i18next from 'i18next';

async function initI18n(): Promise<void> {
  const { default: enBundle } = await import('./en.json');

  await i18next.init({
    lng: 'en',
    debug: import.meta.env.DEV,
    resources: {
      en: {
        translation: enBundle
      }
    }
  });
}

function getCurrentLocale(): string {
  return i18next.language;
}

export {
  initI18n,
  getCurrentLocale
};