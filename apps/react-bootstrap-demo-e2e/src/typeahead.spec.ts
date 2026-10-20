import { test, expect } from '@playwright/test';
import { typeaheadSuite } from '../../../tools/e2e-shared/typeahead-suites';

typeaheadSuite(test, expect, { path: '/basic/typeahead' });
