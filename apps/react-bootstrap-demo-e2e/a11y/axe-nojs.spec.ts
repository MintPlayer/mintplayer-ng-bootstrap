import { test, expect } from '@playwright/test';
import { axeNojsSuite } from '../../../tools/e2e-shared/axe-suites';

// The server-rendered tier must pass the same gate the hydrated tier does.
test.use({ javaScriptEnabled: false });

axeNojsSuite(test, expect, [
  { path: '/' },
  { path: '/enterprise/accordion' },
  { path: '/basic/carousel' },
  { path: '/basic/navbar' },
  { path: '/enterprise/shell' },
]);
