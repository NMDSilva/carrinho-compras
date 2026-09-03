import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['shared/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Inclui `.js` por causa de `frontend/public/` (ex: analytics.js), servido
    // tal e qual ao browser — corre no browser, não em Node.
    files: ['frontend/**/*.{js,ts,vue}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
    },
  },
  {
    files: ['**/*.config.{js,ts,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Componentes gerados pelo shadcn-vue (`npx shadcn-vue add ...`), não
    // escritos à mão. Aqui props opcionais sem valor por omissão são
    // intencionais: o `class` vai para o `cn()`, que trata o `undefined`, e o
    // `variant`/`size` ficam por definir de propósito para o `cva` aplicar os
    // seus próprios defaults.
    files: ['frontend/src/components/ui/**/*.vue'],
    rules: {
      'vue/require-default-prop': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier
)
