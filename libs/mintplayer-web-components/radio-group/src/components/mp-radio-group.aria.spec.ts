import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sharedInternals } from '@mintplayer/web-components/a11y';
import './mp-radio-group';
import type { MpRadioGroup } from './mp-radio-group';
import type { MpRadio } from '@mintplayer/web-components/radio';

/**
 * ARIA state TRANSITIONS for `<mp-radio-group>`.
 *
 * The main spec (`mp-radio-group.spec.ts`) asserts the host role, exclusivity,
 * the keymap, and the FIRST-RENDER values of the roving tab stop and
 * posinset/setsize. This file asserts what happens after that: the set
 * re-numbering as members come and go, and the tab stop following
 * PROGRAMMATIC writes — a framework CVA's `writeValue`/`setDisabledState`
 * writes properties, never events, and that is the path the roving stop and
 * the checked state have to survive.
 *
 * jsdom notes:
 *  - `<mp-radio>` keeps `role="radio"` on its inner native `<input>`, so the
 *    checked state observable from outside is that input's `checked` property;
 *    there is deliberately no `aria-checked` anywhere to read.
 *  - the group's `required` mirrors as `aria-required` on the radiogroup host
 *    (asserted below); `valueMissing` reaches only `internals.setValidity`,
 *    which jsdom does not implement, so validity itself is not observable.
 */
async function settled(el: Element): Promise<void> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
}

/** Flush the connectedCallback microtask + MutationObserver + every Lit update. */
async function synced(group: MpRadioGroup): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settled(group);
  await Promise.all([...group.querySelectorAll('mp-radio')].map(settled));
}

function radiosOf(group: MpRadioGroup): MpRadio[] {
  return [...group.querySelectorAll('mp-radio')] as MpRadio[];
}

function innerInput(radio: MpRadio): HTMLInputElement {
  return radio.shadowRoot!.querySelector('input')!;
}

/** The roving tab stop, as the tab order actually sees it. */
function tabStops(group: MpRadioGroup): (string | null)[] {
  return radiosOf(group).map((radio) => innerInput(radio).getAttribute('tabindex'));
}

function keydown(target: Element, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }),
  );
}

describe('<mp-radio-group> ARIA transitions', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  const THREE = `
    <mp-radio-group name="fruit">
      <mp-radio value="apple">Apple</mp-radio>
      <mp-radio value="banana">Banana</mp-radio>
      <mp-radio value="cherry">Cherry</mp-radio>
    </mp-radio-group>`;

  async function build(markup: string): Promise<MpRadioGroup> {
    host.innerHTML = markup;
    const group = host.querySelector('mp-radio-group') as MpRadioGroup;
    await synced(group);
    return group;
  }

  it('renumbers posinset/setsize when a radio joins the group', async () => {
    const group = await build(THREE);

    const extra = document.createElement('mp-radio') as MpRadio;
    extra.value = 'date';
    extra.textContent = 'Date';
    group.appendChild(extra);
    await synced(group);

    expect(radiosOf(group).map((r) => innerInput(r).getAttribute('aria-posinset'))).toEqual(['1', '2', '3', '4']);
    expect(radiosOf(group).map((r) => innerInput(r).getAttribute('aria-setsize'))).toEqual(['4', '4', '4', '4']);
  });

  it('renumbers posinset/setsize when a radio leaves the group', async () => {
    const group = await build(THREE);

    radiosOf(group)[1].remove();
    await synced(group);

    expect(radiosOf(group).map((r) => r.value)).toEqual(['apple', 'cherry']);
    expect(radiosOf(group).map((r) => innerInput(r).getAttribute('aria-posinset'))).toEqual(['1', '2']);
    expect(radiosOf(group).map((r) => innerInput(r).getAttribute('aria-setsize'))).toEqual(['2', '2']);
  });

  it('moves the single tab stop with a programmatic value write, in both directions', async () => {
    const group = await build(THREE);

    group.value = 'cherry';
    await synced(group);
    expect(tabStops(group)).toEqual(['-1', '-1', '0']);

    group.value = 'apple';
    await synced(group);
    expect(tabStops(group)).toEqual(['0', '-1', '-1']);
  });

  it('parks the tab stop back on the first enabled radio when the value is cleared', async () => {
    const group = await build(THREE.replace('value="banana"', 'value="banana" checked'));
    await synced(group);
    expect(tabStops(group)).toEqual(['-1', '0', '-1']);

    group.value = null;
    await synced(group);
    expect(tabStops(group)).toEqual(['0', '-1', '-1']);
  });

  it('follows a `checked` PROPERTY write on a radio (the CVA path, no event)', async () => {
    const group = await build(THREE);

    radiosOf(group)[2].checked = true;
    await synced(group);

    expect(tabStops(group)).toEqual(['-1', '-1', '0']);
  });

  it('moves the tab stop off a radio disabled programmatically', async () => {
    const group = await build(THREE);
    expect(tabStops(group)).toEqual(['0', '-1', '-1']);

    radiosOf(group)[0].disabled = true;
    await synced(group);

    expect(tabStops(group)).toEqual(['-1', '0', '-1']);
  });

  it('exposes no tab stop while every radio is disabled, and restores one on re-enable', async () => {
    const group = await build(THREE);

    const all = radiosOf(group);
    // Property writes, so this is also the "framework disabled every option" path.
    all.map((radio) => (radio.disabled = true));
    await synced(group);
    expect(tabStops(group).every((value) => value === '-1')).toBe(true);

    all[1].disabled = false;
    await synced(group);
    expect(tabStops(group)).toEqual(['-1', '0', '-1']);
  });

  it('carries the tab stop along with arrow-key selection, forwards and back', async () => {
    const group = await build(THREE);
    const radios = radiosOf(group);

    radios[0].checked = true;
    await synced(group);

    keydown(radios[0], 'ArrowRight');
    await synced(group);
    expect(tabStops(group)).toEqual(['-1', '0', '-1']);

    keydown(radios[1], 'ArrowLeft');
    await synced(group);
    expect(tabStops(group)).toEqual(['0', '-1', '-1']);
  });

  it('re-homes the tab stop when the radio holding it is removed', async () => {
    // Without this the whole group drops out of the tab order and can never be
    // entered again — the reachability failure this phase exists to prevent.
    const group = await build(THREE.replace('value="apple"', 'value="apple" checked'));
    await synced(group);
    expect(tabStops(group)).toEqual(['0', '-1', '-1']);

    radiosOf(group)[0].remove();
    await synced(group);

    expect(tabStops(group)).toEqual(['0', '-1']);
  });

  it('flips the checked state on the role-bearing inner input both ways, keeping exactly one set', async () => {
    const group = await build(THREE);

    group.value = 'banana';
    await synced(group);
    expect(radiosOf(group).map((r) => innerInput(r).checked)).toEqual([false, true, false]);

    group.value = 'apple';
    await synced(group);
    expect(radiosOf(group).map((r) => innerInput(r).checked)).toEqual([true, false, false]);
  });

  it('invents no aria-label on the group, on either surface', async () => {
    // The role sits on a light-DOM host, so the consumer's own naming works
    // natively — a synthesised name here would only shadow it. Checked on the
    // attribute AND on the shared ElementInternals, since the mixin attaches
    // internals and a name written there would be just as invisible in markup.
    const group = await build(THREE);
    expect(group.hasAttribute('aria-label')).toBe(false);
    expect(sharedInternals(group)?.ariaLabel ?? null).toBeNull();
  });

  it('never copies the host reference attributes onto the radios', async () => {
    const group = await build(`
      <span id="fruit-label">Pick a fruit</span>
      <span id="fruit-hint">One only</span>
      ${THREE.replace('<mp-radio-group', '<mp-radio-group aria-labelledby="fruit-label" aria-describedby="fruit-hint"')}`);

    // IDREFs resolve against the host's own tree, where the consumer's ids live.
    expect(group.getAttribute('aria-labelledby')).toBe('fruit-label');
    expect(group.getAttribute('aria-describedby')).toBe('fruit-hint');

    const copied = radiosOf(group).some(
      (radio) =>
        radio.hasAttribute('aria-labelledby')
        || radio.hasAttribute('aria-describedby')
        || radio.hasAttribute('aria-label')
        || innerInput(radio).hasAttribute('aria-labelledby')
        || innerInput(radio).hasAttribute('aria-describedby'),
    );
    expect(copied).toBe(false);
  });
});
