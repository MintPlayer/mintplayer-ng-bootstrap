import { test, expect } from '@playwright/test';
import { rovingFocusSuite } from '../../../tools/e2e-shared/roving-focus-suites';

rovingFocusSuite(test, expect, {
  name: 'radio-group',
  path: '/basic/forms/radio',
  container: (page) => page.locator('mp-radio-group[name="fruitTemplate"]'),
  // Playwright CSS pierces shadow roots: these are the real focus targets —
  // the input inside each mp-radio (delegatesFocus makes the host tabindex
  // irrelevant, which is exactly what the suite must prove).
  items: (page) => page.locator('mp-radio-group[name="fruitTemplate"] input[type="radio"]'),
  forwardKey: 'ArrowRight',
});

rovingFocusSuite(test, expect, {
  name: 'tab-control',
  path: '/basic/containers/tab-control',
  container: (page) => page.locator('mp-tab-control').first(),
  items: (page) => page.locator('mp-tab-control').first().locator('[role="tab"]'),
  forwardKey: 'ArrowRight',
});
