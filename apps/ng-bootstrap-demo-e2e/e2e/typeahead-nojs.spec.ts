import { test, expect } from '@playwright/test';
import { typeaheadNojsSuite } from '../../../tools/e2e-shared/typeahead-suites';

// Angular renders the typeahead from its own template, so SSR emits a real
// named input (#436 D15). React and Vue demos do not server-render it.
test.use({ javaScriptEnabled: false });

typeaheadNojsSuite(test, expect, { path: '/overlays/typeahead' });
