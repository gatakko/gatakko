import globals from 'globals'
import eslintJs from '@eslint/js'
import eslintTs from 'typescript-eslint'
import eslintReactRecommended from 'eslint-plugin-react/configs/recommended.js'
import eslintReactHooks from 'eslint-plugin-react-hooks'
import eslintPromise from 'eslint-plugin-promise'
import eslintImport from 'eslint-plugin-import'

export default [
  { ignores: ['**/dist/**/*'] },
  { linterOptions: { reportUnusedDisableDirectives: true } },
  eslintJs.configs.recommended,
  eslintPromise.configs['flat/recommended'],
  eslintImport.flatConfigs.recommended,
  {
    settings: {
      'import/resolver': 'typescript'
    }
  },
  {
    // derived from StandardJS
    rules: {
      'no-var': 'error',
      'object-shorthand': ['error', 'properties'],
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      camelcase: ['error', { properties: 'never' }],
      curly: ['error', 'multi-line'],
      'default-case-last': 'error',
      'dot-notation': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'new-cap': ['error', { capIsNew: false }],
      'no-array-constructor': 'error',
      'no-caller': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-implied-eval': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-multi-str': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-object-constructor': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-unreachable-loop': 'error',
      'no-unused-expressions': 'error',
      'no-unused-vars': [
        'error',
        {
          args: 'all',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-use-before-define': ['error', { classes: false, variables: false }],
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-void': ['error', { allowAsStatement: true }],
      'one-var': ['error', { initialized: 'never' }],
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
      'symbol-description': 'error',
      'unicode-bom': 'error',
      yoda: 'error',
      'import/export': 'error',
      'import/first': 'error',
      'import/no-absolute-path': 'error',
      'import/no-duplicates': 'error',
      'import/no-named-default': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'promise/no-nesting': 'off',
      'promise/always-return': ['error', { ignoreLastCallback: true }]
    }
  },
  ...eslintTs.configs.strictTypeChecked.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}']
  })),
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/dot-notation': 'error',
      'dot-notation': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true }
      ],
      '@typescript-eslint/method-signature-style': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE']
        }
      ],
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowAsThisParameter: true }
      ],
      '@typescript-eslint/no-unused-expressions': 'error',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-use-before-define': [
        'error',
        { classes: false, variables: false }
      ],
      'no-use-before-define': 'off',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true }
      ],
      '@typescript-eslint/return-await': ['error', 'always'],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowString: false, allowNumber: false, allowNullableObject: false }
      ],
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { lib: 'never', types: 'never' }
      ]
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser }
  },
  {
    ...eslintReactRecommended,
    files: ['src/**/*.tsx'],
    languageOptions: eslintReactRecommended.languageOptions,
    settings: { react: { version: '16.0' } }
  },
  {
    plugins: { 'react-hooks': eslintReactHooks },
    rules: { ...eslintReactHooks.configs['recommended-latest'].rules },
    files: ['src/**/*.{ts,tsx}']
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off'
      //'react/no-unknown-property': 'off'
    }
  }
]
