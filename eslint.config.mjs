import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'warn',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  // --- Workspace lint relaxations (added with the ESLint 10 flat-config migration) ---
  // `nx lint` had never run in CI, so enabling it surfaced pre-existing findings.
  // These are demoted rather than fixed with large/risky edits in the Angular 22
  // dependency PR; they remain visible as warnings. Angular-specific relaxations
  // live in ./eslint.config.angular-relax.mjs (spread last in each Angular project).
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off', // intentional CVA / no-op callbacks
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'prefer-const': 'warn',
    },
  },
];
