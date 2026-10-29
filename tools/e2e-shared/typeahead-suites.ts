import type { Locator, Page, test as testBase, expect as expectBase } from '@playwright/test';

type Test = typeof testBase;
type Expect = typeof expectBase;

/**
 * One suite for the three typeahead demo pages (#436). The pages are three
 * fronts of one headless core, so they must behave identically; each page
 * provides two typeaheads with the same accessible names:
 *
 *  - "Artist"               — a 1.5 s provider that honours its AbortSignal and
 *                             counts aborts in `[data-testid=aborted]`; picks are
 *                             echoed in `[data-testid=selected]`.
 *  - "Artist, highlighted"  — an in-memory provider with debounce 0 and a custom
 *                             row (a `<mark>` around the match).
 *
 * Everything is found by role and name, never by framework-specific markup.
 */
export interface TypeaheadSuiteOptions {
  path: string;
}

const combobox = (page: Page, name: string): Locator => page.getByRole('combobox', { name, exact: true });

async function listboxOf(input: Locator): Promise<Locator> {
  const id = await input.getAttribute('aria-controls');
  if (!id) throw new Error('combobox has no aria-controls');
  return input.page().locator(`[id="${id}"]`);
}

export function typeaheadSuite(test: Test, expect: Expect, { path }: TypeaheadSuiteOptions) {
  test.describe('typeahead', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      // Hydrated: the input reacts only once the front's machine is attached. The
      // server already renders it visible, so wait on the readiness mark.
      const hydrated = (name: string) => page.locator('.mp-typeahead[data-mp-hydrated]').filter({ has: combobox(page, name) });
      await expect(hydrated('Artist')).toHaveCount(1);
      await expect(hydrated('Artist, highlighted')).toHaveCount(1);
    });

    test('typing shows suggestions, with the custom row and the combobox state', async ({ page }) => {
      const input = combobox(page, 'Artist, highlighted');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await input.fill('mi');
      const listbox = await listboxOf(input);
      await expect(input).toHaveAttribute('aria-expanded', 'true');
      await expect(listbox.getByRole('option')).toHaveCount(2); // Michael Jackson, Michael Bublé
      await expect(listbox.getByRole('option').first().locator('mark')).toHaveText(/mi/i);
    });

    test('arrow keys move aria-activedescendant with focus kept in the input; Enter writes the text', async ({ page }) => {
      const input = combobox(page, 'Artist, highlighted');
      await input.fill('noel');
      const listbox = await listboxOf(input);
      await expect(listbox.getByRole('option')).toHaveCount(1);
      await input.press('ArrowDown');
      const optionId = await listbox.getByRole('option').first().getAttribute('id');
      await expect(input).toHaveAttribute('aria-activedescendant', optionId!);
      await expect(input).toBeFocused();
      await input.press('Enter');
      await expect(input).toHaveValue('Noel Gallagher');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(input).not.toHaveAttribute('aria-activedescendant', /.+/);
    });

    test('Escape closes the list', async ({ page }) => {
      const input = combobox(page, 'Artist, highlighted');
      await input.fill('chris');
      await expect(input).toHaveAttribute('aria-expanded', 'true');
      await input.press('Escape');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(input).toBeFocused();
    });

    // PRD #437 C1: component sheets live in @layer mp.components and Bootstrap in
    // mp.bootstrap, so an UNLAYERED consumer rule wins even at lower specificity
    // than the scoped one (.mp-typeahead[data-mps] .dropdown-item[data-mps]).
    test('an unlayered consumer rule overrides the component and baseline layers', async ({ page }) => {
      await page.addStyleTag({ content: '.dropdown-item { white-space: pre; padding-left: 7px; }' });
      const input = combobox(page, 'Artist, highlighted');
      await input.fill('mi');
      const option = (await listboxOf(input)).getByRole('option').first();
      await expect(option).toHaveCSS('white-space', 'pre'); // beats the component layer
      await expect(option).toHaveCSS('padding-left', '7px'); // beats the Bootstrap layer
    });

    test('a superseded slow request is aborted and only the newest answer shows', async ({ page }) => {
      const input = combobox(page, 'Artist');
      await input.pressSequentially('mi', { delay: 20 });
      // Past the 200 ms debounce, so the request for "mi" is in flight…
      await page.waitForTimeout(400);
      // …and typing on supersedes it before its 1.5 s answer.
      await input.pressSequentially('ch', { delay: 20 });
      await expect(page.getByTestId('aborted')).toHaveText('1');
      const listbox = await listboxOf(input);
      await expect(listbox.getByRole('option')).toHaveCount(2, { timeout: 5000 }); // "mich": both Michaels
      await listbox.getByRole('option').first().click();
      await expect(page.getByTestId('selected')).toHaveText('Michael Jackson');
      await expect(input).toHaveValue('Michael Jackson');
    });
  });
}

/** With JavaScript disabled, a server-rendering front still yields a named, labelled text input. */
export function typeaheadNojsSuite(test: Test, expect: Expect, { path }: TypeaheadSuiteOptions) {
  test.describe('typeahead (no JS)', () => {
    test('renders a labelled combobox input that accepts free text', async ({ page }) => {
      await page.goto(path);
      const input = combobox(page, 'Artist');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await input.fill('Free text');
      await expect(input).toHaveValue('Free text');
    });
  });
}
