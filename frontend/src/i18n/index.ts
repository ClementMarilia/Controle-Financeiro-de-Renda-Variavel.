import ptBR from './locales/pt-BR';

const locales = { 'pt-BR': ptBR };
let currentLocale: keyof typeof locales = 'pt-BR';

export function t(key: string): string {
  const keys = key.split('.');
  let obj: unknown = locales[currentLocale];
  for (const k of keys) {
    if (typeof obj !== 'object' || obj === null) return key;
    obj = (obj as Record<string, unknown>)[k];
  }
  return typeof obj === 'string' ? obj : key;
}

export function setLocale(locale: string): void {
  if (locale in locales) currentLocale = locale as keyof typeof locales;
}
