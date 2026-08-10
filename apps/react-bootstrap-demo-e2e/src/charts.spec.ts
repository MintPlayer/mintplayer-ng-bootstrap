import { test, expect } from '@playwright/test';
import { chartsSuite } from '../../../tools/e2e-shared/charts-suites';

chartsSuite(test, expect, { framework: 'react' });
