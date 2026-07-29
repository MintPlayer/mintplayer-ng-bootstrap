import { test, expect } from '@playwright/test';
import { axeNojsSuite } from '../../../tools/e2e-shared/axe-suites';

// The server-rendered tier must pass the same gate the hydrated tier does —
// no-JS users get the DSD chrome and the CSS state machines.
test.use({ javaScriptEnabled: false });

axeNojsSuite(test, expect, [
  { path: '/' },
  { path: '/enterprise/accordion' },
  { path: '/basic/carousel' },
  { path: '/overlays/shell' },
]);
