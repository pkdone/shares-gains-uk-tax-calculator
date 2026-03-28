import { FlatCompat } from '@eslint/eslintrc';
import nextEslintPlugin from '@next/eslint-plugin-next';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import tseslint from 'typescript-eslint';

// CJS package: use default import and destructure — `import { flatConfig } from '...'` fails under ESM.
const { flatConfig: nextFlatConfig } = nextEslintPlugin;

if (nextFlatConfig.coreWebVitals.name !== 'next/core-web-vitals') {
  throw new Error(
    'Unexpected @next/eslint-plugin-next flatConfig; reinstall devDependencies.',
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  {
    ignores: [
      '.next/',
      'node_modules/',
      'coverage/',
      'jest.config.js',
      'postcss.config.mjs',
      'next-env.d.ts',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    rules: {
      'react/no-array-index-key': 'error',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-lonely-if': 'error',
      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' },
      ],
      '@typescript-eslint/member-ordering': 'error',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowArray: false,
          allowNullish: false,
          allowRegExp: false,
        },
      ],
      'no-console': 'error',
      'no-nested-ternary': 'error',
      'no-negated-condition': 'warn',
      'prefer-regex-literals': 'error',
    },
  },

  {
    files: ['eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ['src/shared/app-logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
