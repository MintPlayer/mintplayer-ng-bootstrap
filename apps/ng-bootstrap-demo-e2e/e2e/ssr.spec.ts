import { test, expect } from '@playwright/test';
import { ssrSuite } from '../../../tools/e2e-shared/ssr-suites';

// PRD #437 §9.2/§9.4: one route per migrated component; each wave appends its own.
ssrSuite(test, expect, [
  { path: '/overlays/typeahead', expect: ['[role=combobox]', '[role=listbox]'] },
  { path: '/basic/containers/card', expect: ['.card .card-header', '.card .card-body'] },
  { path: '/basic/forms/input-group', expect: ['bs-input-group.input-group[data-mps=input-group] > input'] },
  { path: '/basic/forms/checkbox', expect: ['bs-checkbox label.form-check > input[type=checkbox].form-check-input'] },
  { path: '/basic/forms/radio', expect: ['bs-radio-group[role=radiogroup] label.form-check > input[type=radio].form-check-input'] },
  { path: '/basic/pagination', expect: ['bs-pagination > nav[aria-label] > ul.pagination > li.page-item > button.page-link[aria-label]'] },
  { path: '/overlays/shell', expect: ['bs-shell.shell[data-mps=shell] > input.shell-toggle-wide[checked]', 'bs-shell .sidebar-root > aside.sidebar'] },
]);
