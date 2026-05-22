import { test, expect, Page } from '@playwright/test';
// End-to-end coverage for the OTP / segmented-code input. The unit tests in
// libs/.../otp-input/**/*.spec.ts run in jsdom and miss:
//   - Real-browser focus delegation through the wrapper's host `.focus()` override
//   - Autofocus directive timing against the wrapper's lazy WC ref
//   - OS-level paste event semantics
//   - SMS-style autofill (single multi-char `input` event from autocomplete=one-time-code)
//   - Active-box highlight rendering across multiple simultaneous instances on the same page
//   - Disabled state respecting click/keyboard input in a real document

// Wait for the OTP page to reach an interactive state. Different browsers need
// different signals:
//
//  - Chromium: `waitForLoadState('networkidle')` works and matches the repo's
//    other e2e specs (see project_e2e_destructive_bootstrap memory). It also
//    naturally gates on the FocusOnLoadDirective's setTimeout(10) firing,
//    which avoids races against autofocused-state assertions.
//
//  - Firefox: the OTP page has 6+ WC instances whose SSR hydration keeps
//    network "not idle" longer than networkidle's 30s default. Wait directly
//    for the classic WC to be upgraded + FocusOnLoadDirective to have placed
//    focus inside its hidden input. Same end-state, different signal.
async function waitReady(page: Page, browserName: string): Promise<void> {
  if (browserName !== 'firefox') {
    await page.waitForLoadState('networkidle');
    return;
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    const classic = document.querySelector('bs-otp-input[data-testid="classic"] mp-otp-input');
    const shadow = (classic as Element & { shadowRoot: ShadowRoot | null } | null)?.shadowRoot;
    if (!shadow) return false;
    const inner = shadow.activeElement as HTMLElement | null;
    return !!(inner && inner.classList.contains('hidden-input'));
  }, { timeout: 15000 });
}

// Helper: read the canonical `value` property off the WC, bypassing the
// wrapper. Avoids any need to dig into shadow DOM for the displayed slice.
async function wcValue(page: Page, testid: string): Promise<string> {
  return await page.evaluate((tid) => {
    const host = document.querySelector(`bs-otp-input[data-testid="${tid}"]`);
    const wc = host?.querySelector('mp-otp-input') as { value?: string } | null;
    return wc?.value ?? '';
  }, testid);
}

// Helper: count boxes carrying the box-active class in a given instance.
async function activeBoxCount(page: Page, testid: string): Promise<number> {
  return await page.evaluate((tid) => {
    const host = document.querySelector(`bs-otp-input[data-testid="${tid}"]`);
    const wc = host?.querySelector('mp-otp-input');
    if (!wc?.shadowRoot) return 0;
    return wc.shadowRoot.querySelectorAll('.box.box-active').length;
  }, testid);
}

// Helper: identify whether the focused element is the hidden input inside a
// given bs-otp-input instance. We can't simply check `document.activeElement`
// — that returns the host (`<bs-otp-input>`) when focus is delegated into
// shadow DOM. Walk shadowRoot.activeElement to confirm.
async function isInstanceFocused(page: Page, testid: string): Promise<boolean> {
  return await page.evaluate((tid) => {
    const host = document.querySelector(`bs-otp-input[data-testid="${tid}"]`);
    const wc = host?.querySelector('mp-otp-input');
    const inner = wc?.shadowRoot?.activeElement;
    return !!(inner && (inner as HTMLElement).classList.contains('hidden-input'));
  }, testid);
}

test.describe('otp-input — focus + autofocus', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('FocusOnLoadDirective lands focus on the autofocused classic OTP', async ({ page }) => {
    expect(await isInstanceFocused(page, 'classic')).toBe(true);
    expect(await isInstanceFocused(page, 'pin')).toBe(false);
  });

  test('programmatic .focus() on the bs-otp-input host delegates to the hidden input', async ({ page }) => {
    // PIN section is not autofocused on load. Call the wrapper host's .focus()
    // and assert the call routed into the shadow-DOM hidden input. This is the
    // exact code path FocusOnLoadDirective uses (it grabs the host element from
    // ViewContainerRef and calls .focus() on it).
    expect(await isInstanceFocused(page, 'pin')).toBe(false);
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]') as HTMLElement;
      host.focus();
    });
    expect(await isInstanceFocused(page, 'pin')).toBe(true);
    expect(await isInstanceFocused(page, 'classic')).toBe(false);
  });
});

test.describe('otp-input — valueChange + complete', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('typing digits streams partial values into the bound ngModel', async ({ page }) => {
    // Classic OTP autofocuses — keyboard goes straight in. Type one at a time
    // and read the WC's canonical value between each keystroke.
    await page.keyboard.type('1');
    expect(await wcValue(page, 'classic')).toBe('1');
    await page.keyboard.type('2');
    expect(await wcValue(page, 'classic')).toBe('12');
    await page.keyboard.type('3');
    expect(await wcValue(page, 'classic')).toBe('123');
  });

  test('completing the field fires (complete) and the demo handler runs', async ({ page }) => {
    // The demo binds (complete) to onClassicComplete which writes the value
    // into a signal that renders an alert-success element. If the event
    // doesn't fire, the alert never appears.
    await expect(page.locator('.alert-success')).toHaveCount(0);
    await page.keyboard.type('123456');
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('partial value does NOT fire (complete) — alert stays hidden', async ({ page }) => {
    await page.keyboard.type('12345');
    // Give the page a tick to settle any pending CD.
    await page.waitForTimeout(50);
    await expect(page.locator('.alert-success')).toHaveCount(0);
  });

  test('clearing then re-completing re-fires (complete)', async ({ page }) => {
    await page.keyboard.type('123456');
    await expect(page.locator('.alert-success')).toBeVisible();
    // Click the "Clear" button next to the classic OTP.
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.alert-success')).toHaveCount(0);
    // Re-focus + type again — autofocus didn't survive the clear because the
    // FocusOnLoadDirective only fires once on mount.
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="classic"]') as HTMLElement;
      host.focus();
    });
    await page.keyboard.type('654321');
    await expect(page.locator('.alert-success code')).toHaveText('654321');
  });
});

test.describe('otp-input — paste handling', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('synthetic paste strips non-digits and fills from index 0 regardless of focus', async ({ page }) => {
    // Focus the classic OTP on box 3 conceptually (type two digits first so
    // the caret is past index 0). Then paste a longer string with separator
    // junk. Spec: paste always fills from index 0 ignoring caret position.
    await page.keyboard.type('99');
    expect(await wcValue(page, 'classic')).toBe('99');

    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="classic"]');
      const wc = host?.querySelector('mp-otp-input');
      const input = wc?.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      // Firefox ignores `clipboardData` passed to ClipboardEvent's constructor
      // (the property comes back null). Build a plain Event and attach a
      // synthetic clipboardData via defineProperty so the WC's paste handler
      // sees identical shape across Chromium/Firefox.
      const ev = new Event('paste', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(ev, 'clipboardData', {
        value: { getData: (type: string) => (type === 'text' ? 'Your code: 123-456 thanks' : '') },
      });
      input.dispatchEvent(ev);
    });

    expect(await wcValue(page, 'classic')).toBe('123456');
    // And the (complete) handler fired.
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('license-key paste strips dashes and uppercases per case="upper"', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="office"]');
      const wc = host?.querySelector('mp-otp-input');
      const input = wc?.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      input.focus();
      const ev = new Event('paste', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(ev, 'clipboardData', {
        value: { getData: (type: string) => (type === 'text' ? 'abc123-def456-7890-asdf-zxcvbn-qwerty' : '') },
      });
      input.dispatchEvent(ev);
    });
    expect(await wcValue(page, 'office')).toBe('ABC123DEF4567890ASDFZXCVBNQWERTY');
    expect((await wcValue(page, 'office')).length).toBe(32);
  });
});

test.describe('otp-input — SMS autofill simulation', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('iOS-style single multi-char input event fills the field and fires (complete)', async ({ page }) => {
    // iOS/Android dispatch a single `input` event on the autocomplete=one-time-code
    // input with the full code at once. Simulate that here on the classic OTP.
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="classic"]');
      const wc = host?.querySelector('mp-otp-input');
      const input = wc?.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      input.focus();
      // Directly assign the value (as the browser does for autofill) then
      // dispatch the `input` event. inputType is 'insertReplacementText' for
      // Safari autofill; other browsers vary but our handler only looks at
      // value-vs-previous-length delta, not inputType.
      input.value = '123456';
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertReplacementText',
        data: '123456',
      }));
    });

    expect(await wcValue(page, 'classic')).toBe('123456');
    await expect(page.locator('.alert-success code')).toHaveText('123456');
  });

  test('autofill on a non-classic-OTP shape (license key) does not trigger autocomplete=one-time-code attr', async ({ page }) => {
    // The office key has non-uniform groups → autocomplete must be 'off',
    // never 'one-time-code'. Verify the hidden input's attribute.
    const autocomplete = await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="office"]');
      const wc = host?.querySelector('mp-otp-input');
      const input = wc?.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      return input.getAttribute('autocomplete');
    });
    expect(autocomplete).toBe('off');

    // And the classic OTP's hidden input does have it.
    const classicAutocomplete = await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="classic"]');
      const wc = host?.querySelector('mp-otp-input');
      const input = wc?.shadowRoot?.querySelector('.hidden-input') as HTMLInputElement;
      return input.getAttribute('autocomplete');
    });
    expect(classicAutocomplete).toBe('one-time-code');
  });
});

test.describe('otp-input — clipboard (real OS clipboard via navigator.clipboard)', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    // Firefox doesn't grant clipboard-read/write the same way; skip there to
    // avoid OS-permission popups. Chromium handles it.
    test.skip(browserName !== 'chromium', 'clipboard permission API is Chromium-only in headless test runs');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('OS-level Ctrl+V paste lands the same as a synthetic paste event', async ({ page }) => {
    await page.evaluate(async () => {
      await navigator.clipboard.writeText('Your code is 246810');
    });
    // Classic OTP is autofocused on load; press Ctrl+V.
    await page.keyboard.press('Control+V');
    expect(await wcValue(page, 'classic')).toBe('246810');
    await expect(page.locator('.alert-success code')).toHaveText('246810');
  });
});

test.describe('otp-input — active-box highlight', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('only the autofocused instance shows a box-active highlight on load', async ({ page }) => {
    // The classic OTP is autofocused → exactly one box-active in its shadow.
    expect(await activeBoxCount(page, 'classic')).toBe(1);

    // Other instances are not focused → zero highlighted boxes. Without the
    // focus-gated fix, every instance would show its next-to-fill box as
    // active even though they're not accepting input.
    expect(await activeBoxCount(page, 'pin')).toBe(0);
    expect(await activeBoxCount(page, 'office')).toBe(0);
    expect(await activeBoxCount(page, 'windows')).toBe(0);
    expect(await activeBoxCount(page, 'reactive')).toBe(0);
  });

  test('moving focus transfers the highlight to the newly-focused instance', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]') as HTMLElement;
      host.focus();
    });
    // PIN gets the highlight, classic loses it.
    expect(await activeBoxCount(page, 'pin')).toBe(1);
    expect(await activeBoxCount(page, 'classic')).toBe(0);
  });

  test('blurring all OTP inputs drops every highlight', async ({ page }) => {
    // The classic OTP starts focused. Click outside (on the h1) to blur.
    await page.locator('h1').click();
    expect(await activeBoxCount(page, 'classic')).toBe(0);
    expect(await activeBoxCount(page, 'pin')).toBe(0);
  });
});

test.describe('otp-input — disabled state', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('setting disabled=true via attribute prevents typing from mutating the value', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]');
      const wc = host?.querySelector('mp-otp-input');
      wc?.setAttribute('disabled', '');
    });
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]') as HTMLElement;
      host.focus();
    });
    await page.keyboard.type('9999');
    expect(await wcValue(page, 'pin')).toBe('');
  });

  test('toggling disabled off restores typability', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]');
      const wc = host?.querySelector('mp-otp-input');
      wc?.setAttribute('disabled', '');
    });
    // Try typing while disabled — should be a no-op.
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]') as HTMLElement;
      host.focus();
    });
    await page.keyboard.type('12');
    expect(await wcValue(page, 'pin')).toBe('');

    // Remove disabled — typing must work again.
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]');
      const wc = host?.querySelector('mp-otp-input');
      wc?.removeAttribute('disabled');
    });
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="pin"]') as HTMLElement;
      host.focus();
    });
    await page.keyboard.type('34');
    expect(await wcValue(page, 'pin')).toBe('34');
  });
});

test.describe('otp-input — reactive forms invalid state', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/enterprise/otp-input');
    await waitReady(page, browserName);
  });

  test('control is invalid+untouched on load — no red border on the WC', async ({ page }) => {
    // FR-15 + .is-invalid convention: do not paint red until touched.
    const invalidAttr = await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="reactive"]');
      const wc = host?.querySelector('mp-otp-input');
      return wc?.hasAttribute('invalid');
    });
    expect(invalidAttr).toBe(false);
  });

  test('after focusing and blurring with empty value, the WC carries invalid="true"', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="reactive"]') as HTMLElement;
      host.focus();
    });
    // Blur by clicking the page heading.
    await page.locator('h1').click();
    // Wait for the CVA's microtask to flush syncInvalid.
    await page.waitForTimeout(50);
    const invalidAttr = await page.evaluate(() => {
      const host = document.querySelector('bs-otp-input[data-testid="reactive"]');
      const wc = host?.querySelector('mp-otp-input');
      return wc?.hasAttribute('invalid');
    });
    expect(invalidAttr).toBe(true);
  });
});
