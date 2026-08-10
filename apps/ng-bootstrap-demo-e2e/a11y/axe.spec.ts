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
  {
    path: '/basic/forms/phone-input',
    // Open the picker: the closed control and the 244-option listbox are
    // different DOM, and only the second exercises the rich-option markup.
    interact: async (page) => {
      await page.locator('mp-phone-input').first().click();
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
    // Select an event so the audit sees the SELECTED state — the revealed
    // resize glyphs/strips are gated on it (wcag22aa target-size applies).
    // Then move to the TIMELINE and open a row's actions panel: the trigger
    // (aria-haspopup/-expanded inside a rowheader) and the panel itself
    // (role=dialog owning a native colour input) are the surfaces this gate
    // previously never reached, because it only ever scanned week view.
    interact: async (page) => {
      await page.getByRole('button', { name: 'Load Sample Data' }).click();
      await page.getByRole('button', { name: /Lunch & Learn/ }).click();

      await page.evaluate(() => {
        const sched = document.querySelector('mp-scheduler') as HTMLElement & {
          options?: unknown;
        };
        sched.shadowRoot!
          .querySelector<HTMLElement>('.scheduler-view-switcher button[data-view="timeline"]')
          ?.click();
        // The resource-tree capabilities are off by default, and the trigger is
        // absent without them — grant them so there is a panel to audit.
        sched.options = {
          permissions: {
            createResource: true,
            createGroup: true,
            updateResource: true,
            deleteResource: true,
          },
        };
      });
      await page.waitForFunction(
        () =>
          !!document
            .querySelector('mp-scheduler')!
            .shadowRoot!.querySelector('.scheduler-row-menu-button'),
      );
      await page.evaluate(() => {
        document
          .querySelector('mp-scheduler')!
          .shadowRoot!.querySelector<HTMLElement>('.scheduler-row-menu-button')!
          .click();
      });
      await page.waitForFunction(
        () =>
          !!document
            .querySelector('mp-scheduler')!
            .shadowRoot!.querySelector('.scheduler-row-panel'),
      );
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
  {
    path: '/enterprise/charts',
    ready: async (page) => {
      await page.waitForSelector('mp-hierarchy-chart [role="tree"]');
    },
    // The three hierarchy layouts are different DOM (svg paths vs positioned
    // divs) and the zoomed-in state adds the enabled zoom-out control, so the
    // audit walks all of it rather than only the default sunburst at root.
    interact: async (page) => {
      await page.locator('mp-hierarchy-chart [role="treeitem"]').first().click();
      await page.getByRole('button', { name: 'icicle' }).click();
      await page.waitForSelector('mp-hierarchy-chart .icicle');
      await page.getByRole('button', { name: 'treemap' }).click();
      await page.waitForSelector('mp-hierarchy-chart .treemap');
    },
  },
  { path: '/overlays/shell' },
  { path: '/overlays/modals' },
  { path: '/advanced/signature-pad' },
  { path: '/advanced/scrollspy' },
]);
