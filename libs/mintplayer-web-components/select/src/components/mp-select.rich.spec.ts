import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-select';
import { MpSelect, type MpSelectOption } from './mp-select';

/**
 * Rich options are a progressive enhancement over customizable select
 * (`appearance: base-select`), which jsdom does not implement — so the seam
 * under test is the element's own gating: WHEN it goes rich (feature + renderer
 * + `.options` mode + plain dropdown, all at once) and what each side of the
 * gate renders. The visual recipe itself was measured per-engine in spike S2
 * and is covered by the demo e2e.
 */
const OPTIONS: MpSelectOption[] = [
  { value: 'be', label: 'België +32 (BE)' },
  { value: 'fr', label: 'France +33 (FR)' },
];

const renderer = (o: MpSelectOption) =>
  `<svg viewBox="0 0 3 2" aria-hidden="true"></svg><span class="rich-label">${o.label}</span>`;

async function mount(configure: (el: MpSelect) => void): Promise<MpSelect> {
  const el = document.createElement('mp-select') as MpSelect;
  configure(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function stubSupport(value: boolean): void {
  vi.spyOn(MpSelect as unknown as { supportsBaseSelect(): boolean }, 'supportsBaseSelect').mockReturnValue(value);
}

describe('mp-select rich options', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('goes rich only when the engine supports base-select', async () => {
    stubSupport(true);
    const el = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
    });
    expect(el.hasAttribute('rich')).toBe(true);
    expect(el.shadowRoot!.querySelector('option svg')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('selectedcontent')).toBeTruthy();
    // The authored mirror button — WebKit's UA-generated one mirrors nothing.
    expect(el.shadowRoot!.querySelector('select > button > selectedcontent')).toBeTruthy();
  });

  it('falls back to plain text options where unsupported — the baseline, unchanged', async () => {
    stubSupport(false);
    const el = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
    });
    expect(el.hasAttribute('rich')).toBe(false);
    expect(el.shadowRoot!.querySelector('option svg')).toBeNull();
    expect(el.shadowRoot!.querySelector('selectedcontent')).toBeNull();
    const labels = [...el.shadowRoot!.querySelectorAll('option')].map((o) => o.textContent);
    expect(labels).toEqual(['België +32 (BE)', 'France +33 (FR)']);
  });

  it('never goes rich for a multiple select or a visible list-box', async () => {
    stubSupport(true);
    const multi = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
      e.multiple = true;
    });
    expect(multi.hasAttribute('rich')).toBe(false);

    const listbox = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
      e.numberVisible = 5;
    });
    expect(listbox.hasAttribute('rich')).toBe(false);
  });

  it('never goes rich in slotted mode — the textContent label trap', async () => {
    stubSupport(true);
    document.body.innerHTML = `<mp-select><option value="be">Belgium</option></mp-select>`;
    const el = document.body.querySelector('mp-select') as MpSelect;
    el.optionRenderer = renderer;
    await el.updateComplete;
    expect(el.hasAttribute('rich')).toBe(false);
  });

  it('keeps an option plain when the renderer declines it', async () => {
    stubSupport(true);
    const el = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = (o) => (o.value === 'be' ? renderer(o) : undefined);
    });
    const [be, fr] = [...el.shadowRoot!.querySelectorAll('option')];
    expect(be.querySelector('svg')).toBeTruthy();
    expect(fr.querySelector('svg')).toBeNull();
    expect(fr.textContent).toBe('France +33 (FR)');
  });

  it('drops back out of rich when the renderer is cleared', async () => {
    stubSupport(true);
    const el = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
    });
    expect(el.hasAttribute('rich')).toBe(true);
    el.optionRenderer = null;
    await el.updateComplete;
    expect(el.hasAttribute('rich')).toBe(false);
    expect(el.shadowRoot!.querySelector('option svg')).toBeNull();
  });

  it('still emits exactly one change + one value-change per commit in rich mode', async () => {
    stubSupport(true);
    const el = await mount((e) => {
      e.options = OPTIONS;
      e.optionRenderer = renderer;
    });
    const changes: string[] = [];
    el.addEventListener('change', () => changes.push('change'));
    el.addEventListener('value-change', () => changes.push('value-change'));

    const select = el.shadowRoot!.querySelector('select')!;
    select.value = 'fr';
    select.dispatchEvent(new Event('change'));
    expect(changes.sort()).toEqual(['change', 'value-change']);
    expect(el.value).toBe('fr');
  });
});
