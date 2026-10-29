import { test, expect, Page } from '@playwright/test';

// End-to-end coverage for the OTP / segmented-code input (generated from
// @mintplayer/ui-core/otp-input, #437). The unit specs run in jsdom and miss:
//   - Real-browser focus delegation through the host's `.focus()` override
//   - Autofocus directive timing
//   - OS-level paste event semantics
//   - SMS-style autofill (single multi-char `input` event from autocomplete=one-time-code)
//   - Active-box highlight rendering across several instances on one page
//
// Everything renders in the light DOM: the real input is `bs-otp-input input`.

// The page is interactive once the classic code holds focus (autofocus) and its
// boxes are rendered (hydrated).
async function waitReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    const host = document.querySelector('bs-otp-input[data-testid="classic"]');
    return !!host?.querySelector('.otp-box') && document.activeElement === host.querySelector('input');
  }, { timeout: 15000 });
}

const input = (testid: string) => `bs-otp-input[data-testid="${testid}"] input`;

async function value(page: Page, testid: string): Promise<string> {
  return await page.locator(input(testid)).inputValue();
}

async function activeBoxCount(page: Page, testid: string): Promise<number> {
  return await page.locator(`bs-otp-input[data-testid="${testid}"] .otp-box-active`).count();
}

async function isInstanceFocused(page: Page, testid: string): Promise<boolean> {
  return await page.locator(input(testid)).evaluate((el) => document.activeElement === el);
}

async function focusHost(page: Page, testid: string): Promise<void> {
  await page.evaluate((tid) => (document.querySelector(`bs-otp-input[data-testid="${tid}"]`) as HTMLElement).focus(), testid);
}

/** A paste whose clipboardData every engine sees (Firefox drops it from the constructor). */
async function paste(page: Page, testid: string, text: string): Promise<void> {
  await page.locator(input(testid)).evaluate((el, t) => {
    (el as HTMLInputElement).focus();
    const ev = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: (type: string) => (type === 'text' ? t : '') } });
    el.dispatchEvent(ev);
  }, text);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/enterprise/otp-input');
  await waitReady(page);
});

test.describe('otp-input — focus + autofocus', () => {
  test('FocusOnLoadDirective lands focus on the autofocused classic OTP', async ({ page }) => {
    expect(await isInstanceFocused(page, 'classic')).toBe(true);
    expect(await isInstanceFocused(page, 'pin')).toBe(false);
  });

  test('programmatic .focus() on the bs-otp-input host delegates to its input', async ({ page }) => {
    await focusHost(page, 'pin');
    expect(await isInstanceFocused(page, 'pin')).toBe(true);
    expect(await isInstanceFocused(page, 'classic')).toBe(false);
  });
});

test.describe('otp-input — valueChange + complete', () => {
  test('typing digits streams partial values', async ({ page }) => {
    await page.keyboard.type('1');
    expect(await value(page, 'classic')).toBe('1');
    await page.keyboard.type('23');
    expect(await value(page, 'classic')).toBe('123');
  });

  test('completing the field fires (complete) and the demo handler runs', async ({ page }) => {
    await expect(page.locator('.alert-success')).toHaveCount(0);
    await page.keyboard.type('123456');
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('partial value does NOT fire (complete)', async ({ page }) => {
    await page.keyboard.type('12345');
    await page.waitForTimeout(50);
    await expect(page.locator('.alert-success')).toHaveCount(0);
  });

  test('clearing then re-completing re-fires (complete)', async ({ page }) => {
    await page.keyboard.type('123456');
    await expect(page.locator('.alert-success')).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.alert-success')).toHaveCount(0);
    await focusHost(page, 'classic');
    await page.keyboard.type('654321');
    await expect(page.locator('.alert-success code')).toHaveText('654321');
  });
});

test.describe('otp-input — paste handling', () => {
  test('paste strips non-digits and fills from index 0 regardless of the caret', async ({ page }) => {
    await page.keyboard.type('99');
    await paste(page, 'classic', 'Your code: 123-456 thanks');
    expect(await value(page, 'classic')).toBe('123456');
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('license-key paste strips dashes and uppercases per letterCase="upper"', async ({ page }) => {
    await paste(page, 'office', 'abc123-def456-7890-asdf-zxcvbn-qwerty');
    expect(await value(page, 'office')).toBe('ABC123DEF4567890ASDFZXCVBNQWERTY');
  });
});

test.describe('otp-input — SMS autofill simulation', () => {
  test('a single multi-char input event fills the field and fires (complete)', async ({ page }) => {
    await page.locator(input('classic')).evaluate((el) => {
      (el as HTMLInputElement).value = '123456';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: '123456' }));
    });
    expect(await value(page, 'classic')).toBe('123456');
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('only a classic numeric code asks for one-time-code autofill', async ({ page }) => {
    await expect(page.locator(input('office'))).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator(input('classic'))).toHaveAttribute('autocomplete', 'one-time-code');
  });
});

test.describe('otp-input — clipboard (real OS clipboard via navigator.clipboard)', () => {
  test('OS-level Ctrl+V paste lands the same as a synthetic paste event', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permission API is Chromium-only in headless test runs');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(async () => navigator.clipboard.writeText('Your code is 246810'));
    await page.keyboard.press('Control+V');
    expect(await value(page, 'classic')).toBe('246810');
    await expect(page.locator('.alert-success code')).toHaveText('246810');
  });
});

test.describe('otp-input — active-box highlight', () => {
  test('only the focused instance shows a highlighted box', async ({ page }) => {
    expect(await activeBoxCount(page, 'classic')).toBe(1);
    expect(await activeBoxCount(page, 'pin')).toBe(0);
    expect(await activeBoxCount(page, 'office')).toBe(0);
    expect(await activeBoxCount(page, 'reactive')).toBe(0);
  });

  test('moving focus transfers the highlight', async ({ page }) => {
    await focusHost(page, 'pin');
    await expect(page.locator('bs-otp-input[data-testid="pin"] .otp-box-active')).toHaveCount(1);
    expect(await activeBoxCount(page, 'classic')).toBe(0);
  });

  test('blurring drops every highlight', async ({ page }) => {
    await page.locator('h1').click();
    await expect(page.locator('bs-otp-input .otp-box-active')).toHaveCount(0);
  });
});

test.describe('otp-input — reactive forms invalid state', () => {
  test('an untouched invalid control is not painted invalid', async ({ page }) => {
    await expect(page.locator(input('reactive'))).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('bs-otp-input[data-testid="reactive"] .otp-box-invalid')).toHaveCount(0);
  });

  test('focusing and leaving it empty marks it invalid', async ({ page }) => {
    await focusHost(page, 'reactive');
    await page.locator('h1').click();
    await expect(page.locator(input('reactive'))).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('bs-otp-input[data-testid="reactive"] .otp-box-invalid').first()).toBeVisible();
  });
});
