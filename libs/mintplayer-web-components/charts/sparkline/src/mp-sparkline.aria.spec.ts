import { beforeEach, describe, expect, it } from 'vitest';
import { MpSparkline } from './index';

void MpSparkline; // force the side-effect registration

/**
 * `<mp-sparkline>` is a non-interactive graphic: role="img" with a generated
 * "first, last, lowest, highest" summary name (locale-formatted), overridable
 * via host `aria-label` > `input-label` > `summaryFormatter`. No tab stop, ever
 * — the numbers belong in the table cell next to it.
 */
async function mount(points: (number | null)[], attrs = ''): Promise<MpSparkline> {
  document.body.innerHTML = `<mp-sparkline locale="en-US" ${attrs}></mp-sparkline>`;
  const el = document.querySelector('mp-sparkline') as MpSparkline;
  el.points = points;
  await el.updateComplete;
  return el;
}

describe('mp-sparkline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is a role=img with the generated first/last/min/max name and no tab stop', async () => {
    const el = await mount([1000, 1200, 900, 1500]);
    expect(el.shadowRoot).toBeNull();
    const img = el.querySelector('svg')!;
    expect(img.getAttribute('role')).toBe('img');
    expect(img.getAttribute('aria-label')).toBe('1,000, 1,500, 900, 1,500');
    expect(el.querySelector('[tabindex]')).toBeNull();
  });

  it('input-label, a host aria-label and summaryFormatter override the generated name', async () => {
    const el = await mount([1, 2, 3], 'input-label="Coverage trend"');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Coverage trend');
    el.setAttribute('aria-label', 'From host');
    // The host's aria-label is observed (a MutationObserver), then re-rendered.
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('From host');
    el.removeAttribute('aria-label');
    await new Promise((r) => setTimeout(r, 0));
    el.inputLabel = null;
    el.summaryFormatter = (points) => `${points.length} samples`;
    await el.updateComplete;
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('3 samples');
  });

  it('a null point splits the line into two runs; last dot sits on the final value', async () => {
    const el = await mount([1, 2, null, 3, 4]);
    const d = el.querySelector('.line')!.getAttribute('d')!;
    expect((d.match(/M /g) ?? []).length).toBe(2);
    expect(el.querySelector('.dot')).toBeTruthy();
  });

  it('area fill renders only when enabled; empty points render nothing', async () => {
    const bare = await mount([1, 2, 3]);
    expect(bare.querySelector('.fill')).toBeNull();
    const area = await mount([1, 2, 3], 'area');
    expect(area.querySelector('.fill')).toBeTruthy();
    const empty = await mount([]);
    expect(empty.querySelector('svg[role=img]')).toBeNull();
    expect(empty.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('flat series (all equal) still renders without NaN geometry', async () => {
    const el = await mount([5, 5, 5]);
    expect(el.querySelector('.line')!.getAttribute('d')).not.toContain('NaN');
  });
});
