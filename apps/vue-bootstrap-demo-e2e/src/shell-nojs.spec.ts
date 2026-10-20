import { test, expect } from '@playwright/test';
import { shellNojsSuite } from '../../../tools/e2e-shared/shell-suites';

// The Vue demo's whole layout is a BsShell (App.vue); this runs it against the
// SSR server with scripting off.
shellNojsSuite(test, expect, { path: '/' });
