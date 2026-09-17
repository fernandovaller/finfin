import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

export type Idioma = 'pt-BR' | 'en';

const CHAVE = 'finfin_idioma';

export function lerIdioma(): Idioma {
  const v = localStorage.getItem(CHAVE);
  return v === 'en' ? 'en' : 'pt-BR';
}

export function salvarIdioma(l: Idioma): void {
  localStorage.setItem(CHAVE, l);
  void i18n.changeLanguage(l);
}

/** Locale BCP-47 para Intl (formatação de moeda/data). */
export function localeIntl(): string {
  return i18n.language === 'en' ? 'en-US' : 'pt-BR';
}

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: typeof window === 'undefined' ? 'pt-BR' : lerIdioma(),
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
});

export default i18n;
