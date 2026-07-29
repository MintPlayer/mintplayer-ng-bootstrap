import { test, expect } from '@playwright/test';
import { axeNojsSuite } from '../../../tools/e2e-shared/axe-suites';

// The server-rendered tier must pass the same gate the hydrated tier does.
// JS stays ON in the page (axe needs it); the suite feeds script-stripped
// SSR markup, which IS the no-JS DOM.

axeNojsSuite(test, expect, [
  { path: '/' },
  { path: '/enterprise/accordion' },
  { path: '/basic/carousel' },
  { path: '/basic/navbar' },
  { path: '/enterprise/shell' },
]);
