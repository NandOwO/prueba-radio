import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, type Locale, LOCALES } from '@pulsofm/shared';
import en from './locales/en.json';
import es from './locales/es.json';

const STORAGE_KEY = 'pulsofm.locale';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved;
  } catch {
    // Almacenamiento bloqueado (modo privado): usamos el idioma del navegador.
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Sin persistencia: el cambio dura hasta recargar.
  }
  void i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

export default i18n;
