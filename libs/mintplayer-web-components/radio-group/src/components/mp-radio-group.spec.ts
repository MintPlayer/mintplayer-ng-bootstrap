import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-radio-group';
import type { MpRadioGroup, RadioGroupChangeEventDetail } from './mp-radio-group';
import type { MpRadio } from '@mintplayer/web-components/radio';

async function settled(root: ParentNode): Promise<void> {
  const els = [...root.querySelectorAll('mp-radio, mp-radio-group')] as unknown as { updateComplete: Promise<unknown> }[];
  await Promise.all(els.map((el) => el.updateComplete));
}

describe('<mp-radio-group>', () => {
  let host: HTMLElement;
  const group = () => host.querySelector('mp-radio-group') as MpRadioGroup;
  const radios = () => [...host.querySelectorAll('mp-radio')] as MpRadio[];
  const inputs = () => [...host.querySelectorAll('input[type=radio]')] as HTMLInputElement[];

  beforeEach(async () => {
    host = document.createElement('div');
    host.innerHTML = `
      <form>
        <mp-radio-group aria-label="Size">
          <mp-radio value="s">Small</mp-radio>
          <mp-radio value="m" checked>Medium</mp-radio>
          <mp-radio value="l">Large</mp-radio>
        </mp-radio-group>
      </form>`;
    document.body.appendChild(host);
    await settled(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('is a light-DOM radiogroup', () => {
    expect(group().shadowRoot).toBeNull();
    expect(group().getAttribute('role')).toBe('radiogroup');
    expect(group().getAttribute('aria-label')).toBe('Size');
  });

  it('gives every radio one generated name, so the browser groups them', () => {
    const names = new Set(inputs().map((input) => input.name));
    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^mp-radio-group-\d+-name$/);
  });

  it('uses its own name when given one', async () => {
    group().setAttribute('name', 'size');
    await settled(host);
    expect(inputs().map((input) => input.name)).toEqual(['size', 'size', 'size']);
  });

  it('reports the value and emits group-change on a pick', () => {
    const events: RadioGroupChangeEventDetail[] = [];
    group().addEventListener('group-change', (event) => events.push((event as CustomEvent<RadioGroupChangeEventDetail>).detail));
    expect(group().value).toBe('m');
    inputs()[2].click();
    expect(group().value).toBe('l');
    expect(radios().map((radio) => radio.checked)).toEqual([false, false, true]);
    expect(events).toEqual([{ value: 'l' }]);
  });

  it('selects by value', () => {
    group().value = 's';
    expect(inputs().map((input) => input.checked)).toEqual([true, false, false]);
  });

  it('hands required and disabled to every radio', async () => {
    group().setAttribute('required', '');
    group().setAttribute('disabled', '');
    await settled(host);
    expect(group().getAttribute('aria-required')).toBe('true');
    expect(group().getAttribute('aria-disabled')).toBe('true');
    expect(inputs().every((input) => input.required && input.disabled)).toBe(true);
  });

  it('submits the checked radio through its native input', () => {
    group().setAttribute('name', 'size');
    return settled(host).then(() => {
      expect(new FormData(host.querySelector('form')!).getAll('size')).toEqual(['m']);
    });
  });
});
