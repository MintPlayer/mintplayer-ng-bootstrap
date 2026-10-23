import { test, expect } from '@playwright/test';
import { tileManagerSuite } from '../../../tools/e2e-shared/tile-manager-suites';

tileManagerSuite(test, expect, { path: '/enterprise/tile-manager' });
