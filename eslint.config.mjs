import js from '@eslint/js'
import globals from 'globals'
import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'

export default ts.config(
  {
    ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Nuxt подставляет макросы и композаблы автоимпортом, а отсутствующие
      // идентификаторы всё равно ловит TypeScript.
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': ['error', { singleline: 4, multiline: 1 }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
