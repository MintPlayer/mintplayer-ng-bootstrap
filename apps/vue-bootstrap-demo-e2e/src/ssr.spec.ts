import { test, expect } from '@playwright/test';
import { ssrSuite } from '../../../tools/e2e-shared/ssr-suites';

// PRD #437 §9.2/§9.4: one route per migrated component; each wave appends its own.
ssrSuite(test, expect, [
  { path: '/basic/typeahead', expect: ['[role=combobox]', '[role=listbox]'] },
]);
