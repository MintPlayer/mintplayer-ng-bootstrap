import { test, expect } from '@playwright/test';
import { axeAuditSuite } from '../../../tools/e2e-shared/axe-suites';

// Explicit list, not route discovery: the gate only covers what is listed.
axeAuditSuite(test, expect, [
  { path: '/' },
  { path: '/basic/calendar' },
  { path: '/basic/card' },
  { path: '/basic/carousel' },
  { path: '/basic/checkbox' },
  { path: '/basic/code-snippet' },
  { path: '/basic/dropdown-menu' },
  { path: '/basic/forms/datepicker' },
  { path: '/basic/forms/datetime-picker' },
  { path: '/basic/forms/multi-range' },
  { path: '/basic/forms/select' },
  { path: '/basic/forms/timepicker' },
  { path: '/basic/navbar' },
  { path: '/basic/pagination' },
  {
    path: '/basic/radio',
    interact: async (page) => {
      await page.locator('mp-radio-group[name="color"] input[type="radio"]').first().click();
    },
  },
  {
    path: '/basic/tab-control',
    interact: async (page) => {
      await page.locator('mp-tab-control').first().locator('[role="tab"]').nth(1).click();
    },
  },
  { path: '/basic/toggle-button' },
  { path: '/basic/tree-select' },
  { path: '/basic/treeview' },
  {
    path: '/enterprise/accordion',
    ready: async (page) => {
      await page.waitForFunction(() => !!document.querySelector('mp-accordion')?.hasAttribute('data-js'));
    },
    interact: async (page) => {
      await page.locator('mp-accordion').first().locator('summary').first().click();
    },
  },
  { path: '/enterprise/datatables' },
  {
    path: '/enterprise/dock',
    ready: async (page) => {
      await page.waitForSelector('mint-dock-manager');
    },
  },
  {
    path: '/enterprise/file-manager',
    ready: async (page) => {
      await page.waitForSelector('mp-file-manager');
    },
  },
  { path: '/enterprise/query-builder' },
  {
    path: '/enterprise/scheduler',
    ready: async (page) => {
      await page.waitForSelector('mp-scheduler');
    },
  },
  { path: '/enterprise/shell' },
  { path: '/enterprise/tile-manager' },
  { path: '/enterprise/timeline' },
  { path: '/advanced/otp-input' },
  { path: '/advanced/signature-pad' },
  { path: '/advanced/splitter' },
]);
