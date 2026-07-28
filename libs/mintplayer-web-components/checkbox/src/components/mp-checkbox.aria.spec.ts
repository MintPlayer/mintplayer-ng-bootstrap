import { beforeEach, describe, expect, it } from 'vitest';
import './mp-checkbox';
import type { MpCheckbox } from './mp-checkbox';

/**
 * Naming contract for `<mp-checkbox>`, plus a regression guard on the specific
 * mistake this component used to make.
 *
 * It *intended* to support `aria-labelledby` and copied the id string onto its
 * shadow `<input>`. That is silently dead: an IDREF resolves only within the
 * holder's own tree, so the input pointed at an id that does not exist inside the
 * shadow root. Visible in devtools, conveying nothing — which is worse than an
 * omission, because it reads as correct in a review. Only the *mechanism* was
 * wrong; the intent is now served by resolving the ids in the host's tree and
 * assigning the resulting elements to the input's `ariaLabelledByElements`.
 *
 * The positive cross-root assertion is not here and cannot be: jsdom implements
 * neither `ariaLabelledByElements` nor an accessibility tree. Spike 0.2 covers it
 * in three real engines. What IS asserted below is that the dead mechanism has not
 * come back.
 */
async function mount(html: string): Promise<{ host: MpCheckbox; input: HTMLInputElement }> {
  document.body.innerHTML = html;
  const host = document.querySelector('mp-checkbox') as MpCheckbox;
  await host.updateComplete;
  return { host, input: host.shadowRoot!.querySelector('input') as HTMLInputElement };
}

describe('mp-checkbox naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the inner <input> from input-label', async () => {
    const { input } = await mount('<mp-checkbox input-label="Accept terms"></mp-checkbox>');
    expect(input.getAttribute('aria-label')).toBe('Accept terms');
  });

  it('names it from the inputLabel property, kept live', async () => {
    const { host, input } = await mount('<mp-checkbox></mp-checkbox>');
    host.inputLabel = 'First';
    await host.updateComplete;
    expect(input.getAttribute('aria-label')).toBe('First');

    host.inputLabel = 'Second';
    await host.updateComplete;
    expect(input.getAttribute('aria-label')).toBe('Second');
  });

  it('lets a host aria-label win over input-label', async () => {
    const { input } = await mount(
      '<mp-checkbox aria-label="From host" input-label="From property"></mp-checkbox>',
    );
    expect(input.getAttribute('aria-label')).toBe('From host');
  });

  it('needs input-label even with slotted visible text, which is NOT the name', async () => {
    // The slotted label sits in a <span class="form-check-label"> that is not
    // associated with the input by for/id across the shadow boundary, so it does
    // not name the control. This is why a label property is required at all.
    const { input } = await mount('<mp-checkbox>Accept terms</mp-checkbox>');
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('does NOT copy aria-labelledby inward as an IDREF string', async () => {
    // The regression guard. If this fails, someone has restored the dead
    // mechanism: an id copied into the shadow root resolves against the shadow
    // root, where the consumer's element does not exist.
    const { input } = await mount(
      '<span id="outer">Accept</span><mp-checkbox aria-labelledby="outer"></mp-checkbox>',
    );
    expect(input.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('does NOT copy aria-describedby inward as an IDREF string either', async () => {
    const { input } = await mount(
      '<span id="hint">Required</span><mp-checkbox aria-describedby="hint"></mp-checkbox>',
    );
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('applies input-label to the toggle_button variant too', async () => {
    // A different render path with its own <input>, previously duplicating the
    // same three attribute reads — so worth asserting rather than assuming.
    const { input } = await mount(
      '<mp-checkbox type="toggle_button" input-label="Bold"></mp-checkbox>',
    );
    expect(input.getAttribute('aria-label')).toBe('Bold');
    expect(input.getAttribute('role')).toBe('button');
  });

  it('keeps the name when type switches, which replaces the <input>', async () => {
    // Switching variant discards the old input entirely; a name assigned once
    // would be left on a detached node.
    const { host } = await mount('<mp-checkbox input-label="Bold"></mp-checkbox>');
    host.type = 'toggle_button';
    await host.updateComplete;

    const input = host.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Bold');
  });
});
