import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-checkbox';
import type { MpCheckbox } from './mp-checkbox';

/**
 * Makes the element-reference *assignment* observable in jsdom, which implements
 * neither `ariaLabelledByElements` nor an accessibility tree.
 *
 * Read carefully what this does and does not buy, because the distinction is the
 * whole reason it is defensible. It stubs the reflected properties as plain data
 * slots, so a test can see **which node this library assigned to, and when**. It
 * does *not* simulate what a browser then does with that value — no name is
 * computed, no accessibility tree exists. Platform semantics are spike 0.2's job
 * (`_spike-host-aria/`, three real engines).
 *
 * So the seam is: **our plumbing here, the platform there.** That is a real
 * boundary rather than a convenient one — assigning to a detached node is a bug in
 * our code and is invisible without this, while "does Chromium honour a cross-root
 * reference" is not something a stub could ever answer.
 */
function stubElementReferences(): void {
  for (const proto of [Element.prototype, ElementInternals.prototype]) {
    for (const property of ['ariaLabelledByElements', 'ariaDescribedByElements']) {
      Object.defineProperty(proto, property, {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }
  }
}

function restoreElementReferences(): void {
  for (const proto of [Element.prototype, ElementInternals.prototype]) {
    for (const property of ['ariaLabelledByElements', 'ariaDescribedByElements']) {
      delete (proto as unknown as Record<string, unknown>)[property];
    }
  }
}

/** The elements this library assigned as the accessible-name references. */
function referencesOn(el: Element): Element[] | null | undefined {
  return (el as unknown as { ariaLabelledByElements?: Element[] | null }).ariaLabelledByElements;
}

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

  it('writes NO aria-label when the consumer slots visible text — the slot already names it', async () => {
    /* Reads like a gap and is the opposite. The shadow `<label>` wraps the `<input>`
       and contains the `<slot>`, and accessible-name computation walks the flat
       tree, so `<mp-checkbox>Accept terms</mp-checkbox>` computes the name
       "Accept terms" natively — measured in Chromium's real accessibility tree by
       `_spike-slotted-label/`. Writing an `aria-label` here would be worse than
       useless: `aria-label` OVERRIDES the label association, so it would replace a
       correct, automatically-translated name with a copy that silently drifts.

       This assertion is therefore "the component does not interfere", not "the
       component fails to name". jsdom cannot compute the name, which is precisely
       why an earlier version of this test drew the wrong conclusion from the same
       passing assertion. */
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

/**
 * The `type` switch, which is the case that forced references to be re-synced on
 * every render rather than once.
 *
 * `ariaLabelledByElements` stores real element references, and it stores them **on
 * the node you assign them to**. `mp-checkbox` renders two structurally different
 * templates — `renderCheckOrSwitch()` and `renderToggleButton()` — so switching
 * `type` makes Lit tear down the first and build the second, producing a *different*
 * `<input>`. Assigning in `connectedCallback` alone would leave the reference on the
 * discarded node while the host attribute sat there still looking correct: a control
 * that silently loses its name, with nothing in the DOM to show why.
 */
describe('mp-checkbox reference re-sync across a type change', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    stubElementReferences();
  });

  afterEach(() => {
    restoreElementReferences();
  });

  async function mountWithReference() {
    document.body.innerHTML = `
      <span id="terms">Accept terms</span>
      <mp-checkbox aria-labelledby="terms"></mp-checkbox>`;
    const host = document.querySelector('mp-checkbox') as MpCheckbox;
    await host.updateComplete;
    return {
      host,
      label: document.getElementById('terms') as HTMLElement,
      input: host.shadowRoot!.querySelector('input') as HTMLInputElement,
    };
  }

  it('assigns the resolved element to the inner <input>, not to the host', async () => {
    const { host, label, input } = await mountWithReference();

    expect(referencesOn(input)).toHaveLength(1);
    expect(referencesOn(input)![0]).toBe(label);
    // The host must NOT also hold it: the role is on the <input>, and naming both
    // nodes is how a control ends up announced twice.
    expect(referencesOn(host)).toBeUndefined();
  });

  it('replaces the <input> when type changes — the premise of the whole rule', async () => {
    // Asserted rather than assumed. If Lit ever reused the node here, the re-sync
    // in updated() would be unnecessary for this path, and this test says so
    // directly instead of leaving the reasoning implicit in a comment.
    const { host, input: first } = await mountWithReference();

    host.type = 'toggle_button';
    await host.updateComplete;
    const second = host.shadowRoot!.querySelector('input') as HTMLInputElement;

    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
  });

  it('re-points the reference at the NEW <input> after the type change', async () => {
    // THE regression test. Under a connectedCallback-only implementation this is
    // the assertion that fails: the new input has no reference at all.
    const { host, label } = await mountWithReference();

    host.type = 'toggle_button';
    await host.updateComplete;
    const input = host.shadowRoot!.querySelector('input') as HTMLInputElement;

    expect(referencesOn(input)).toHaveLength(1);
    expect(referencesOn(input)![0]).toBe(label);
  });

  it('survives switching back, and through every variant', async () => {
    const { host, label } = await mountWithReference();

    for (const type of ['toggle_button', 'switch', 'checkbox', 'toggle_button'] as const) {
      host.type = type;
      await host.updateComplete;
      const input = host.shadowRoot!.querySelector('input') as HTMLInputElement;
      expect(referencesOn(input)?.[0], `after switching to ${type}`).toBe(label);
    }
  });

  it('clears the reference when the consumer removes aria-labelledby', async () => {
    // PRD 11a in its negative form: a name that outlives the attribute is a stale
    // name, which is worse than none because it reads as correct.
    const { host } = await mountWithReference();

    host.removeAttribute('aria-labelledby');
    await host.updateComplete;
    const input = host.shadowRoot!.querySelector('input') as HTMLInputElement;

    expect(referencesOn(input)).toBeNull();
  });

  it('resolves aria-describedby onto the same <input>, and re-points it too', async () => {
    document.body.innerHTML = `
      <span id="hint">At least 8 characters</span>
      <mp-checkbox aria-describedby="hint"></mp-checkbox>`;
    const host = document.querySelector('mp-checkbox') as MpCheckbox;
    await host.updateComplete;
    const hint = document.getElementById('hint') as HTMLElement;

    const described = (el: Element) =>
      (el as unknown as { ariaDescribedByElements?: Element[] | null }).ariaDescribedByElements;

    expect(described(host.shadowRoot!.querySelector('input')!)?.[0]).toBe(hint);

    host.type = 'toggle_button';
    await host.updateComplete;
    expect(described(host.shadowRoot!.querySelector('input')!)?.[0]).toBe(hint);
  });
});
