import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-radio-group';
import type { MpRadioGroup, RadioGroupChangeEventDetail } from './mp-radio-group';
import type { MpRadio } from '@mintplayer/web-components/radio';

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

/** What a real user interaction produces: the radio checks itself, then announces. */
function userCheck(radio: MpRadio): void {
  radio.checked = true;
  radio.dispatchEvent(
    new CustomEvent('change', {
      detail: { checked: true, value: radio.value },
      bubbles: true,
      composed: true,
    }),
  );
}

function innerInput(radio: MpRadio): HTMLInputElement {
  return radio.shadowRoot!.querySelector('input')!;
}

function keydown(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('<mp-radio-group>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  async function build(markup: string): Promise<{ group: MpRadioGroup; radios: MpRadio[] }> {
    host.innerHTML = markup;
    const group = host.querySelector('mp-radio-group') as MpRadioGroup;
    await synced(group);
    const radios = [...group.querySelectorAll('mp-radio')] as MpRadio[];
    return { group, radios };
  }

  const THREE = `
    <mp-radio-group name="fruit">
      <mp-radio value="apple">Apple</mp-radio>
      <mp-radio value="banana">Banana</mp-radio>
      <mp-radio value="cherry">Cherry</mp-radio>
    </mp-radio-group>`;

  it('claims role="radiogroup" on the host', async () => {
    const { group } = await build(THREE);
    expect(group.getAttribute('role')).toBe('radiogroup');
  });

  it('does not overwrite a consumer-set role', async () => {
    const { group } = await build(THREE.replace('<mp-radio-group', '<mp-radio-group role="menu"'));
    expect(group.getAttribute('role')).toBe('menu');
  });

  it('enforces exclusivity: a user check unchecks the other radios', async () => {
    const { radios } = await build(THREE);
    userCheck(radios[0]);
    expect(radios[0].checked).toBe(true);
    userCheck(radios[2]);
    expect(radios[2].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(false);
  });

  it('emits group-change with the newly-selected value', async () => {
    const { group, radios } = await build(THREE);
    const values: (string | null)[] = [];
    group.addEventListener('group-change', (event) => {
      values.push((event as CustomEvent<RadioGroupChangeEventDetail>).detail.value);
    });
    userCheck(radios[1]);
    expect(values).toEqual(['banana']);
  });

  it('roves the tab stop through the inner inputs: checked radio holds 0, the rest -1', async () => {
    const { group, radios } = await build(THREE.replace('value="banana"', 'value="banana" checked'));
    await synced(group);
    expect(innerInput(radios[0]).getAttribute('tabindex')).toBe('-1');
    expect(innerInput(radios[1]).getAttribute('tabindex')).toBe('0');
    expect(innerInput(radios[2]).getAttribute('tabindex')).toBe('-1');
  });

  it('parks the stop on the first ENABLED radio when nothing is checked', async () => {
    const { group, radios } = await build(THREE.replace('value="apple"', 'value="apple" disabled'));
    await synced(group);
    expect(innerInput(radios[0]).getAttribute('tabindex')).toBe('-1');
    expect(innerInput(radios[1]).getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight/ArrowDown move AND select the next radio, wrapping at the end', async () => {
    const { group, radios } = await build(THREE);
    userCheck(radios[2]);
    const event = keydown(radios[2], 'ArrowRight');
    await synced(group);
    expect(event.defaultPrevented).toBe(true);
    expect(radios[0].checked).toBe(true);
    expect(radios[2].checked).toBe(false);
  });

  it('ArrowUp/ArrowLeft move backwards and skip disabled radios', async () => {
    const { group, radios } = await build(THREE.replace('value="banana"', 'value="banana" disabled'));
    userCheck(radios[2]);
    keydown(radios[2], 'ArrowUp');
    await synced(group);
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });

  it('Home and End select the first/last enabled radio', async () => {
    const { group, radios } = await build(THREE);
    userCheck(radios[1]);
    keydown(radios[1], 'End');
    await synced(group);
    expect(radios[2].checked).toBe(true);
    keydown(radios[2], 'Home');
    await synced(group);
    expect(radios[0].checked).toBe(true);
  });

  it('inverts ArrowLeft/ArrowRight under direction: rtl', async () => {
    const { group, radios } = await build(THREE);
    group.style.direction = 'rtl';
    userCheck(radios[0]);
    keydown(radios[0], 'ArrowLeft');
    await synced(group);
    expect(radios[1].checked).toBe(true);
  });

  it('stamps aria-posinset and aria-setsize on the radios', async () => {
    const { radios } = await build(THREE);
    expect(radios.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
    expect(radios.map((r) => r.getAttribute('aria-setsize'))).toEqual(['3', '3', '3']);
  });

  it('exposes value as the checked radio, settable to move the selection', async () => {
    const { group, radios } = await build(THREE);
    expect(group.value).toBeNull();
    group.value = 'cherry';
    expect(radios[2].checked).toBe(true);
    expect(group.value).toBe('cherry');
    group.value = null;
    expect(radios.some((r) => r.checked)).toBe(false);
  });

  it('formResetCallback restores the markup-declared checked radio', async () => {
    const { group, radios } = await build(THREE.replace('value="apple"', 'value="apple" checked'));
    await synced(group);
    userCheck(radios[2]);
    (group as unknown as { formResetCallback(): void }).formResetCallback();
    expect(radios[0].checked).toBe(true);
    expect(radios[2].checked).toBe(false);
  });

  it('scopes to its own radios: a nested group is untouched', async () => {
    const { group } = await build(`
      <mp-radio-group>
        <mp-radio value="outer-a">A</mp-radio>
        <mp-radio-group>
          <mp-radio value="inner-a" checked>IA</mp-radio>
        </mp-radio-group>
      </mp-radio-group>`);
    const outer = group.querySelector<MpRadio>('mp-radio[value="outer-a"]')!;
    const inner = group.querySelector<MpRadio>('mp-radio[value="inner-a"]')!;
    userCheck(outer);
    expect(inner.checked).toBe(true);
    expect(outer.getAttribute('aria-setsize')).toBe('1');
  });
});
