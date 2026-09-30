import { afterEach, describe, expect, it } from 'vitest';
import './mp-radio-group';
import '@mintplayer/web-components/radio';
import type { MpRadioGroup, RadioGroupChangeEventDetail } from './mp-radio-group';
import type { MpRadio } from '@mintplayer/web-components/radio';

/** Form association edges and the events the group must NOT react to. */
async function build(markup: string): Promise<{ group: MpRadioGroup; radios: MpRadio[] }> {
  document.body.innerHTML = markup;
  const group = document.body.querySelector('mp-radio-group') as MpRadioGroup;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await group.updateComplete;
  const radios = [...group.querySelectorAll('mp-radio')] as MpRadio[];
  await Promise.all(radios.map((r) => r.updateComplete));
  return { group, radios };
}

const TWO = `
  <mp-radio-group>
    <mp-radio value="a">A</mp-radio>
    <mp-radio value="b">B</mp-radio>
  </mp-radio-group>`;

const keydown = (target: Element, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
};

describe('mp-radio-group form association', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('name reflects to the attribute it submits under, and null removes it', async () => {
    const { group } = await build(TWO);
    group.name = 'letter';
    expect(group.getAttribute('name')).toBe('letter');
    expect(group.name).toBe('letter');
    group.name = null;
    expect(group.hasAttribute('name')).toBe(false);
  });

  it('formRestore selects the saved value and ignores non-string state', async () => {
    const { group, radios } = await build(TWO);
    group.formRestore('b');
    expect(radios.map((r) => r.checked)).toEqual([false, true]);
    expect(group.formValue()).toBe('b');
    group.formRestore(new FormData());
    expect(group.value).toBe('b');
  });

  it('a form reset with no markup default clears the selection', async () => {
    const { group, radios } = await build(TWO);
    group.value = 'a';
    group.formReset();
    expect(radios.every((r) => !r.checked)).toBe(true);
    expect(group.value).toBeNull();
  });
});

describe('mp-radio-group ignores what is not one of its radios', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('a change event from some other element neither unchecks radios nor emits', async () => {
    const { group, radios } = await build(`
      <mp-radio-group>
        <mp-radio value="a" checked>A</mp-radio>
        <input type="checkbox" />
      </mp-radio-group>`);
    const events: RadioGroupChangeEventDetail[] = [];
    group.addEventListener('group-change', (e) => events.push((e as CustomEvent<RadioGroupChangeEventDetail>).detail));
    group.querySelector('input')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(radios[0].checked).toBe(true);
    expect(events).toEqual([]);
  });

  it('keys pressed on something that is not a radio pass through', async () => {
    const { group } = await build(`
      <mp-radio-group>
        <mp-radio value="a">A</mp-radio>
        <button>other</button>
      </mp-radio-group>`);
    const ev = keydown(group.querySelector('button')!, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(false);
  });

  it('an empty group lets keys through', async () => {
    const { group } = await build('<mp-radio-group></mp-radio-group>');
    expect(keydown(group, 'ArrowDown').defaultPrevented).toBe(false);
  });

  it('non-navigation keys on a radio pass through', async () => {
    const { radios } = await build(TWO);
    expect(keydown(radios[0], 'a').defaultPrevented).toBe(false);
  });

  it('an arrow with nowhere to go is still consumed, and selects nothing new', async () => {
    const { group, radios } = await build(`
      <mp-radio-group>
        <mp-radio value="a" checked>A</mp-radio>
        <mp-radio value="b" disabled>B</mp-radio>
      </mp-radio-group>`);
    const events: unknown[] = [];
    group.addEventListener('group-change', (e) => events.push(e));
    expect(keydown(radios[0], 'ArrowDown').defaultPrevented).toBe(true);
    expect(radios[0].checked).toBe(true);
    expect(events).toEqual([]);
  });
});
