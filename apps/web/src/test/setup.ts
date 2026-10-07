import '@testing-library/jest-dom/vitest';
import '../i18n';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { setLocale } from '../i18n';

beforeEach(() => {
  // jsdom reporta en-US; las pruebas validan la UI en español, el idioma por defecto.
  setLocale('es');
});

afterEach(() => cleanup());
