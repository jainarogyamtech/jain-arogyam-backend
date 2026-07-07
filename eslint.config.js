import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules', 'dist', 'build', 'coverage'] },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',           // backends legitimately log to console
      'no-process-exit': 'warn',
      'no-undef': 'error',
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
    },
  },
]