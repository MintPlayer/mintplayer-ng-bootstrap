import { afterEach, describe, expect, it } from 'vitest';
import '@mintplayer/web-components/checkbox';
import type { MpCheckbox } from '@mintplayer/web-components/checkbox';

/**
 * Spike 0.3b, executed as a contract spec: 0.3a already verified the
 * PLATFORM dispatch (formDisabledCallback order, fieldset behaviour) in
 * three real engines; what remains testable here is the mixin's design
 * contract — the OR of author and form-owner state, order-independence,
 * and that a property/attribute write can never defeat a disabled fieldset
 * (finding 4: Angular's setDisabledState is exactly such a writer).
 * jsdom's ElementInternals lacks form association, so the callback is
 * invoked directly, exactly as the UA would.
 */
type Face = MpCheckbox & {
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  effectiveDisabled: boolean;
  formValue(): string | null;
};

async function make(attrs = ''): Promise<Face> {
  document.body.innerHTML = `<mp-checkbox ${attrs}>Accept</mp-checkbox>`;
  await customElements.whenDefined('mp-checkbox');
  const el = document.querySelector('mp-checkbox') as Face;
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('FormAssociatedMixin — disabled contract (spike 0.3a/0.3b)', () => {
  it('the class is form-associated', async () => {
    const el = await make();
    expect((el.constructor as typeof HTMLElement & { formAssociated?: boolean }).formAssociated).toBe(true);
  });

  it('form-owner disabled is honoured with NO attribute present', async () => {
    const el = await make();
    el.formDisabledCallback(true);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.effectiveDisabled).toBe(true);
  });

  it('a setDisabledState-shaped write cannot defeat the form owner (0.3a finding 4)', async () => {
    const el = await make('disabled');
    el.formDisabledCallback(true); // fieldset disables while attribute also set
    el.removeAttribute('disabled'); // CVA re-enables its own control
    expect(el.effectiveDisabled).toBe(true); // the fieldset still forbids it
    el.formDisabledCallback(false); // fieldset released
    expect(el.effectiveDisabled).toBe(false);
  });

  it('the OR is order-independent (0.3a finding 3: callback order is engine-dependent)', async () => {
    const el = await make();
    // WebKit order: callback first, attribute after.
    el.formDisabledCallback(true);
    el.setAttribute('disabled', '');
    expect(el.effectiveDisabled).toBe(true);
    // Chromium/Firefox order: attribute first, callback after.
    el.removeAttribute('disabled');
    el.formDisabledCallback(false);
    expect(el.effectiveDisabled).toBe(false);
  });
});

describe('FormAssociatedMixin — value + reset contract', () => {
  it('an unchecked checkbox submits nothing; a checked one submits its value (default "on")', async () => {
    const el = await make();
    expect(el.formValue()).toBeNull();
    el.setAttribute('checked', '');
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.formValue()).toBe('on');
    el.setAttribute('value', 'newsletter');
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.formValue()).toBe('newsletter');
  });

  it('formResetCallback clears the checked state', async () => {
    const el = await make('checked');
    el.formResetCallback();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.formValue()).toBeNull();
    expect(el.hasAttribute('checked')).toBe(false);
  });
});
