import { test, expect } from '@playwright/test';
import { shellNojsSuite } from '../../../tools/e2e-shared/shell-suites';

// Runs the real Angular SSR server (the e2e `webServer`) with scripting off.
shellNojsSuite(test, expect, { path: '/overlays/shell' });
