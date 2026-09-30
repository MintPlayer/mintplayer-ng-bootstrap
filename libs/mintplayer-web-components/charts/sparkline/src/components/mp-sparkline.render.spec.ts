import { beforeEach, describe, expect, it } from 'vitest';
import './mp-sparkline';
import type { MpSparkline } from './mp-sparkline';

/** What each configuration attribute/property does to the rendered sparkline. */
async function mount(points: (number | null)[], attrs = '', wrapper = ''): Promise<MpSparkline> {
  const tag = `<mp-sparkline ${attrs}></mp-sparkline>`;
  document.body.innerHTML = wrapper ? `<div ${wrapper}>${tag}</div>` : tag;
  const el = document.querySelector('mp-sparkline') as MpSparkline;
  el.points = points;
  await el.updateComplete;
  return el;
}

const svgEl = (el: MpSparkline) => el.shadowRoot!.querySelector('svg');
const dotY = (el: MpSparkline) => Number(el.shadowRoot!.querySelector('.dot')!.getAttribute('cy'));
const dotX = (el: MpSparkline) => Number(el.shadowRoot!.querySelector('.dot')!.getAttribute('cx'));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('mp-sparkline configuration', () => {
  it('show-last-dot="false" hides the end marker; the property turns it back on', async () => {
    const el = await mount([1, 2, 3], 'show-last-dot="false"');
    expect(el.showLastDot).toBe(false);
    expect(el.shadowRoot!.querySelector('.dot')).toBeNull();
    el.showLastDot = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.dot')).not.toBeNull();
  });

  it('the last dot sits on the last non-null value when the series ends in a gap', async () => {
    const trailingGap = await mount([1, 5, null]);
    const x = dotX(trailingGap);
    const complete = await mount([1, 5, 2]);
    // Same x-scale (three slots); the dot is on slot 1, left of slot 2.
    expect(x).toBeLessThan(dotX(complete));
  });

  it('y-min / y-max pin the vertical domain instead of fitting the data', async () => {
    const auto = await mount([5, 10]);
    const fitted = dotY(auto);
    const pinned = await mount([5, 10], 'y-min="0" y-max="100"');
    expect(pinned.yMin).toBe(0);
    expect(pinned.yMax).toBe(100);
    // 10 is the top of the fitted domain but a tenth of the pinned one: lower on screen.
    expect(dotY(pinned)).toBeGreaterThan(fitted);

    pinned.removeAttribute('y-min');
    pinned.removeAttribute('y-max');
    await pinned.updateComplete;
    expect(pinned.yMin).toBeUndefined();
    expect(dotY(pinned)).toBe(fitted);
  });

  it('area follows the attribute, including area="false"', async () => {
    const el = await mount([1, 2, 3], 'area="false"');
    expect(el.area).toBe(false);
    expect(el.shadowRoot!.querySelector('.fill')).toBeNull();
    el.setAttribute('area', '');
    await el.updateComplete;
    expect(el.area).toBe(true);
    expect(el.shadowRoot!.querySelector('.fill')).not.toBeNull();
  });

  it('a lone point between gaps draws a line stub but no area', async () => {
    const el = await mount([null, 4, null], 'area');
    expect(el.shadowRoot!.querySelector('.fill')!.getAttribute('d')).toBe('');
    expect(el.shadowRoot!.querySelector('.line')!.getAttribute('d')).toMatch(/^M /);
  });

  it('an all-null series renders nothing', async () => {
    const el = await mount([null, null]);
    expect(svgEl(el)).toBeNull();
  });

  it('a non-array points value is treated as empty', async () => {
    const el = await mount([1, 2]);
    el.points = undefined as unknown as number[];
    await el.updateComplete;
    expect(el.points).toEqual([]);
    expect(svgEl(el)).toBeNull();
  });
});

describe('mp-sparkline accessible name', () => {
  it('formats the generated name with the locale attribute', async () => {
    const el = await mount([1234.5, 2], 'locale="de-DE"');
    expect(el.locale).toBe('de-DE');
    expect(svgEl(el)!.getAttribute('aria-label')).toBe('1.234,5, 2, 2, 1.234,5');
  });

  it('falls back to the nearest [lang] ancestor without a locale', async () => {
    const el = await mount([1234.5], '', 'lang="de-DE"');
    expect(svgEl(el)!.getAttribute('aria-label')).toBe('1.234,5, 1.234,5, 1.234,5, 1.234,5');
  });

  it('a summaryFormatter returning undefined falls back to the generated name', async () => {
    const el = await mount([1, 3], 'locale="en-US"');
    el.summaryFormatter = () => undefined;
    await el.updateComplete;
    expect(el.summaryFormatter).toBeTypeOf('function');
    expect(svgEl(el)!.getAttribute('aria-label')).toBe('1, 3, 1, 3');
  });

  it('input-label set by attribute reaches the property; removing it restores the summary', async () => {
    const el = await mount([1, 3], 'locale="en-US" input-label="Load"');
    expect(el.inputLabel).toBe('Load');
    el.removeAttribute('input-label');
    await el.updateComplete;
    expect(el.inputLabel).toBeNull();
    expect(svgEl(el)!.getAttribute('aria-label')).toBe('1, 3, 1, 3');
  });
});
