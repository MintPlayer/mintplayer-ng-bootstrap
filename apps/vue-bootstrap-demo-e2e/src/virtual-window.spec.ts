import { test, expect } from '@playwright/test';
import { virtualWindowSuite } from '../../../tools/e2e-shared/virtual-window-suites';

virtualWindowSuite(test, expect, { framework: 'vue', path: '/enterprise/datatables' });
