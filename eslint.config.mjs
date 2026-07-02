import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'packages/**'],
  },
  ...nextVitals,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default config;
