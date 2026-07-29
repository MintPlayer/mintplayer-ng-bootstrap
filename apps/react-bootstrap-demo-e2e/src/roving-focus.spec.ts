import { test, expect } from '@playwright/test';
import { rovingFocusSuite } from '../../../tools/e2e-shared/roving-focus-suites';

rovingFocusSuite(test, expect, {
  name: 'radio-group',
  path: '/basic/radio',
  container: (page) => page.locator('mp-radio-group[name="color"]'),
  items: (page) => page.locator('mp-radio-group[name="color"] input[type="radio"]'),
  forwardKey: 'ArrowRight',
});
