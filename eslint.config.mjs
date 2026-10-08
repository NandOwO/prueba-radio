// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  // Scripts de tooling y pruebas e2e corren en Node.
  { files: ['**/*.{mjs,cjs,js}'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
