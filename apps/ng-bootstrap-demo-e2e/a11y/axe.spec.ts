import { test, expect } from '@playwright/test';
import { axeAuditSuite } from '../../../tools/e2e-shared/axe-suites';

// Explicit list, not route discovery: every entry is a page this programme
// touched. Extend when a new component page ships — the gate only covers
// what is listed here.
axeAuditSuite(test, expect, [
  { path: '/' },
  {
    path: '/basic/forms/radio',
    interact: async (page) => {
      await page.locator('mp-radio-group[name="fruitTemplate"] input[type="radio"]').first().click();
    },
  },
  { path: '/basic/forms/checkbox' },
  { path: '/basic/forms/datepicker' },
  { path: '/basic/forms/datetime-picker' },
  { path: '/basic/forms/multi-range' },
  {
    path: '/basic/containers/tab-control',
    interact: async (page) => {
      await page.locator('mp-tab-control').first().locator('[role="tab"]').nth(1).click();
    },
  },
  { path: '/basic/containers/card' },
  { path: '/basic/pagination' },
  { path: '/basic/treeview' },
  { path: '/basic/tree-select' },
  { path: '/basic/carousel' },
  { path: '/basic/alert' },
  { path: '/basic/rating' },
  {
    path: '/enterprise/accordion',
    ready: async (page) => {
      await page.waitForFunction(() => !!document.querySelector('mp-accordion')?.hasAttribute('data-js'));
    },
    interact: async (page) => {
      await page.locator('mp-accordion').first().locator('summary').first().click();
    },
  },
  {
    path: '/enterprise/datatables',
    ready: async (page) => {
      await page.waitForSelector('mp-datatable');
    },
  },
  {
    path: '/enterprise/dock',
    ready: async (page) => {
      await page.waitForSelector('mint-dock-manager');
    },
  },
  {
    path: '/enterprise/scheduler',
    ready: async (page) => {
      await page.waitForSelector('mp-scheduler');
    },
  },
  {
    path: '/enterprise/file-manager',
    ready: async (page) => {
      await page.waitForSelector('mp-file-manager');
    },
  },
  { path: '/enterprise/tile-manager' },
  { path: '/enterprise/otp-input' },
  { path: '/enterprise/query-builder' },
  { path: '/overlays/shell' },
  { path: '/overlays/modals' },
  { path: '/advanced/signature-pad' },
  { path: '/advanced/scrollspy' },
]);
