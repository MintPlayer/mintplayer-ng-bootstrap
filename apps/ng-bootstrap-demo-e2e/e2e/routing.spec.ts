import { test, expect } from '@playwright/test';

test('navigates to /basic/alert via the navbar dropdown', async ({ page }) => {
  await page.goto('/');

  const navbar = page.locator('bs-navbar');

  // bsNavbarTrigger renders `<a href="javascript:void(0)">` and the dropdown
  // is purely CSS-driven (`li.nav-item:focus-within > ul { display: block }`).
  // On Linux Chromium, .click() on an `<a href="javascript:...">` does not
  // reliably focus the element, so :focus-within never fires and the menu
  // stays closed — Playwright then times out with "element is not visible"
  // on the menu item. Use .focus() instead so the CSS state machine
  // definitely sees the focus.
  const basicTrigger = navbar.getByText('Basic', { exact: true });
  await basicTrigger.focus();

  const alertItem = navbar.getByText('Alert', { exact: true });
  await expect(alertItem).toBeVisible();
  await alertItem.click();

  await expect(page).toHaveURL(/\/basic\/alert$/);
  await expect(page.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
});
