import type { Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

/**
 * The shell's no-JS contract (#437), shared by the three demo apps. Every front
 * renders the same plain HTML from `@mintplayer/ui-core/shell`: one checkbox per
 * viewport mode IS the open state and the hamburger is a `<label for>` it, so
 * the sidebar toggles with scripting off. Found by the shared class names, never
 * by framework-specific markup.
 */
export interface ShellSuiteOptions {
  path: string;
}

const shellOf = (page: Page) => page.locator('.shell[data-mps=shell]').first();

export function shellNojsSuite(test: Test, expect: Expect, { path }: ShellSuiteOptions) {
  test.describe('shell (JavaScript disabled)', () => {
    test.use({ javaScriptEnabled: false });

    test('the hamburger toggles the sidebar with CSS only', async ({ page }) => {
      // Below the `md` breakpoint the sidebar starts collapsed (an off-screen
      // overlay), so opening it is an unambiguous viewport change.
      await page.setViewportSize({ width: 500, height: 900 });
      await page.goto(path, { waitUntil: 'load' });

      const shell = shellOf(page);
      const sidebar = shell.locator('aside.sidebar');
      const hamburger = shell.locator('label.shell-hamburger-narrow');
      await expect(sidebar).toHaveCount(1);
      await expect(sidebar).not.toBeInViewport();

      await hamburger.click();
      await expect(sidebar).toBeInViewport();
      await expect(shell.locator('input.shell-toggle-narrow')).toBeChecked();

      // A real two-way toggle, not a one-shot.
      await hamburger.click();
      await expect(sidebar).not.toBeInViewport();
    });

    test('wide mode starts open and collapses through its own checkbox', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path, { waitUntil: 'load' });

      const shell = shellOf(page);
      const sidebar = shell.locator('aside.sidebar');
      // `checked` means revealed in both modes — no inversion to read around.
      await expect(shell.locator('input.shell-toggle-wide')).toBeChecked();
      await expect(sidebar).toBeInViewport();

      await shell.locator('label.shell-hamburger-wide').click();
      await expect(sidebar).not.toBeInViewport();
      await expect(shell.locator('input.shell-toggle-wide')).not.toBeChecked();
    });
  });
}
