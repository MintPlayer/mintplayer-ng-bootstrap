import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import baseConfig from '../../eslint.config.mjs';
import nx from '@nx/eslint-plugin';
import angularRelax from '../../eslint.config.angular-relax.mjs';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...compat
    .config({
      extends: ['plugin:@angular-eslint/template/process-inline-templates'],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts'],
      rules: {
        ...config.rules,
        '@angular-eslint/directive-selector': 'off',
        '@angular-eslint/component-selector': [
          'error',
          {
            type: 'element',
            prefix: 'mintplayer-ng-bootstrap',
            style: 'kebab-case',
          },
        ],
      },
    })),
  ...nx.configs['flat/angular-template'],
  ...angularRelax,
];
