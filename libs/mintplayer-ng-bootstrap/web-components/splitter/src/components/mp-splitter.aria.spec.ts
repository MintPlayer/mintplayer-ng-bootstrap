import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MpSplitter } from './mp-splitter';

// Force registration before tests construct elements.
void MpSplitter;

async function flush(el: HTMLElement): Promise<void> {
  await (el as MpSplitter).updateComplete;
  // Two macro-task hops to absorb the requestAnimationFrame chain in
  // updatePanelsFromSlot → pinSizesFromCurrentLayout.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await (el as MpSplitter).updateComplete;
}

function makeSplitter(orientation: 'horizontal' | 'vertical', panelCount = 2): MpSplitter {
  const el = document.createElement('mp-splitter') as MpSplitter;
  el.setAttribute('orientation', orientation);
  // jsdom defaults to 0×0 for layout — give the splitter a concrete box so
  // the percent-of-container math has a real denominator. The
  // pinSizesFromCurrentLayout helper that reads wrapper sizes is bypassed
  // by setPanelSizes() in the test setup below — jsdom's identical-rect
  // mock can't distinguish a wrapper from its host.
  el.style.width = '800px';
  el.style.height = '400px';
  for (let i = 0; i < panelCount; i++) {
    const panel = document.createElement('div');
    panel.textContent = `Panel ${i + 1}`;
    panel.style.width = '100%';
    panel.style.height = '100%';
    el.appendChild(panel);
  }
  return el;
}

/** Set equal sizes across panelCount in either an 800px (horiz) or 400px (vert) box. */
async function pinEqualSizes(el: MpSplitter, panelCount: number): Promise<void> {
  const orientation = el.getAttribute('orientation');
  const total = orientation === 'vertical' ? 400 : 800;
  const each = total / panelCount;
  el.setPanelSizes(new Array(panelCount).fill(each));
  await (el as MpSplitter).updateComplete;
}

function dividers(el: MpSplitter): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.divider'));
}

function panelWrappers(el: MpSplitter): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.panel-wrapper'));
}

describe('mp-splitter ARIA', () => {
  beforeEach(() => {
    // jsdom layout — fake getBoundingClientRect to return a known box.
    Element.prototype.getBoundingClientRect = function () {
      const cs = (this as HTMLElement).style;
      const w = parseFloat(cs.width) || 800;
      const h = parseFloat(cs.height) || 400;
      return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) };
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('emits role="separator" + tabindex="0" on each divider', async () => {
    const el = makeSplitter('horizontal', 3);
    document.body.appendChild(el);
    await flush(el);

    const ds = dividers(el);
    expect(ds.length).toBe(2);
    for (const d of ds) {
      expect(d.getAttribute('role')).toBe('separator');
      expect(d.getAttribute('tabindex')).toBe('0');
    }
  });

  it('sets aria-orientation to "vertical" for a horizontal splitter (separator runs perpendicular to panels)', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);

    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('vertical');
  });

  it('sets aria-orientation to "horizontal" for a vertical splitter', async () => {
    const el = makeSplitter('vertical', 2);
    document.body.appendChild(el);
    await flush(el);

    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('updates aria-orientation when the splitter orientation flips', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('vertical');

    el.setAttribute('orientation', 'vertical');
    await flush(el);
    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('assigns deterministic IDs to wrappers and points aria-controls at the adjacent pair', async () => {
    const el = makeSplitter('horizontal', 3);
    document.body.appendChild(el);
    await flush(el);

    const wrappers = panelWrappers(el);
    expect(wrappers.length).toBe(3);
    const ids = wrappers.map((w) => w.id);
    expect(ids[0]).toMatch(/^mp-splitter-\d+-panel-0$/);
    expect(ids[1]).toMatch(/^mp-splitter-\d+-panel-1$/);
    expect(ids[2]).toMatch(/^mp-splitter-\d+-panel-2$/);

    const ds = dividers(el);
    expect(ds[0].getAttribute('aria-controls')).toBe(`${ids[0]} ${ids[1]}`);
    expect(ds[1].getAttribute('aria-controls')).toBe(`${ids[1]} ${ids[2]}`);
  });

  it('labels each divider with its adjacent panel pair', async () => {
    const el = makeSplitter('horizontal', 3);
    document.body.appendChild(el);
    await flush(el);

    const ds = dividers(el);
    expect(ds[0].getAttribute('aria-label')).toBe('Resize between panel 1 and panel 2');
    expect(ds[1].getAttribute('aria-label')).toBe('Resize between panel 2 and panel 3');
  });

  it('emits aria-valuenow / valuemin / valuemax as percent of container', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    // Two equal panels in an 800px container → ~50% each.
    const valuenow = Number(d.getAttribute('aria-valuenow'));
    expect(valuenow).toBeGreaterThanOrEqual(45);
    expect(valuenow).toBeLessThanOrEqual(55);

    const valuemin = Number(d.getAttribute('aria-valuemin'));
    // Default minPanelSize is 50px → ~6%.
    expect(valuemin).toBeGreaterThanOrEqual(5);
    expect(valuemin).toBeLessThanOrEqual(8);

    const valuemax = Number(d.getAttribute('aria-valuemax'));
    // Pair total ≈ 800px; max = (800-50)/800 ≈ 94%.
    expect(valuemax).toBeGreaterThanOrEqual(90);
    expect(valuemax).toBeLessThanOrEqual(95);
  });
});

describe('mp-splitter keyboard resize', () => {
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function () {
      const cs = (this as HTMLElement).style;
      const w = parseFloat(cs.width) || 800;
      const h = parseFloat(cs.height) || 400;
      return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) };
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function getSizes(el: MpSplitter): number[] {
    return el.getPanelSizes();
  }

  it('ArrowRight on a horizontal splitter grows panelBefore by 10% of container', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const before = getSizes(el);
    const beforeSize = before[0];

    const d = dividers(el)[0];
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await flush(el);

    const after = getSizes(el);
    // 10% of 800 = 80
    expect(after[0] - beforeSize).toBeCloseTo(80, 0);
    expect(after[1] - before[1]).toBeCloseTo(-80, 0);
  });

  it('ArrowLeft shrinks panelBefore by 10%; Shift narrows the step to 1%', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    const before = getSizes(el)[0];

    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true, cancelable: true }));
    await flush(el);

    const after = getSizes(el)[0];
    // 1% of 800 = 8
    expect(before - after).toBeCloseTo(8, 0);
  });

  it('ArrowDown on a vertical splitter grows panelBefore; off-axis arrows are no-ops', async () => {
    const el = makeSplitter('vertical', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const before = getSizes(el);

    const d = dividers(el)[0];
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await flush(el);
    expect(getSizes(el)).toEqual(before);

    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await flush(el);
    // 10% of 400 (vertical container) = 40
    expect(getSizes(el)[0] - before[0]).toBeCloseTo(40, 0);
  });

  it('Home shrinks panelBefore to minPanelSize', async () => {
    const el = makeSplitter('horizontal', 2);
    el.setAttribute('min-panel-size', '60');
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await flush(el);

    expect(getSizes(el)[0]).toBeCloseTo(60, 0);
  });

  it('End grows panelBefore until panelAfter is at minPanelSize', async () => {
    const el = makeSplitter('horizontal', 2);
    el.setAttribute('min-panel-size', '60');
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await flush(el);

    expect(getSizes(el)[1]).toBeCloseTo(60, 0);
  });

  it('clamps to minPanelSize when arrow would push past the limit', async () => {
    const el = makeSplitter('horizontal', 2);
    el.setAttribute('min-panel-size', '380');
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    // Equal-sized panels start ~400 each; one ArrowRight would normally take
    // panelAfter to 320 — past the 380 min. The clamp pulls it to 380.
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await flush(el);

    expect(getSizes(el)[1]).toBeCloseTo(380, 0);
  });

  it('updates aria-valuenow after a keyboard resize', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const d = dividers(el)[0];
    const beforeValue = Number(d.getAttribute('aria-valuenow'));

    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await flush(el);

    const afterValue = Number(d.getAttribute('aria-valuenow'));
    // Grew panelBefore by ~10 percentage points.
    expect(afterValue - beforeValue).toBeGreaterThanOrEqual(8);
    expect(afterValue - beforeValue).toBeLessThanOrEqual(12);
  });

  it('emits a resize-end CustomEvent with the new sizes on each keystroke', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);
    await pinEqualSizes(el, 2);

    const events: number[][] = [];
    el.addEventListener('resize-end', (e) => {
      events.push((e as CustomEvent).detail.sizes);
    });

    const d = dividers(el)[0];
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await flush(el);

    expect(events.length).toBe(1);
    expect(events[0].length).toBe(2);
  });

  it('preventDefault is called on resize keys (not on unrelated keys)', async () => {
    const el = makeSplitter('horizontal', 2);
    document.body.appendChild(el);
    await flush(el);

    const d = dividers(el)[0];

    const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    d.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(true);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    d.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });
});
