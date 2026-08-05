// Separate config so the headed native-popup probe stays out of the default sweep.
// Run: npx playwright test --config docs/prd/_spike-phone-input-narrow/playwright.headed.config.ts --headed
import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({ ...base, testMatch: 'firefox-popup.spec.ts' });
