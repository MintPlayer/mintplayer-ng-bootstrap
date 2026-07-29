import { afterEach, describe, expect, it } from 'vitest';
import './mint-multi-range.element';
import type { MintMultiRangeElement } from './mint-multi-range.element';

/**
 * ARIA surface of `<mp-multi-range>` — the multi-thumb slider.
 *
 * The whole point of a dual-thumb slider is that each thumb is its own
 * `role="slider"` with its own value range, and that the range each thumb may
 * report is bounded by its neighbours (block-crossing + `minDistance`) rather
 * than by `min`/`max` alone. So every assertion here is about the values a
 * screen reader would read *after* something changed — via a keyboard step and
 * via a programmatic property write, in both directions where the state can go
 * back.
 *
 * jsdom notes: this component sets `role` with a plain `setAttribute` (no
 * `ElementInternals`), so the host role IS observable here. Pointer paths need
 * real layout (`getBoundingClientRect`) and are covered by the keyboard path
 * instead — the keyboard entry point applies the identical constraint pipeline
 * (`snapToStep` → `constrainThumb`).
 */
async function mount(setup?: (el: MintMultiRangeElement) => void): Promise<MintMultiRangeElement> {
  const el = document.createElement('mp-multi-range') as MintMultiRangeElement;
  setup?.(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function thumbs(el: MintMultiRangeElement): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.thumb'));
}

function valueNow(el: MintMultiRangeElement): number[] {
  return thumbs(el).map((t) => Number(t.getAttribute('aria-valuenow')));
}

async function press(
  el: MintMultiRangeElement,
  thumbIndex: number,
  key: string,
): Promise<void> {
  thumbs(el)[thumbIndex].dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  await el.updateComplete;
}

describe('mp-multi-range ARIA — roles and naming channel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('defaults the host to role="group" and never clobbers an author-supplied role', async () => {
    const el = await mount();
    expect(el.getAttribute('role')).toBe('group');

    const authored = await mount((host) => host.setAttribute('role', 'none'));
    expect(authored.getAttribute('role')).toBe('none');
  });

  it('renders one role="slider" per value, in ascending order', async () => {
    const el = await mount((host) => {
      host.value = [80, 20];
    });
    const t = thumbs(el);
    expect(t.length).toBe(2);
    expect(t.map((x) => x.getAttribute('role'))).toEqual(['slider', 'slider']);
    // The value setter sorts ascending, so thumb 0 is always the lower bound.
    expect(valueNow(el)).toEqual([20, 80]);
  });

  it('never copies the host naming attributes into the shadow root; thumbs are told apart by their own tooltip text', async () => {
    document.body.innerHTML = '<span id="outer">Price</span>';
    const el = await mount((host) => {
      host.setAttribute('aria-label', 'Price range');
      host.setAttribute('aria-labelledby', 'outer');
      host.setAttribute('aria-describedby', 'outer');
      host.value = [20, 80];
    });

    // The role lives on the HOST, so the consumer's aria-label already names the
    // group natively — nothing to forward, and IDREF strings would be dead inside.
    expect(el.getAttribute('aria-label')).toBe('Price range');
    const t = thumbs(el);
    expect(t.some((x) => x.hasAttribute('aria-labelledby'))).toBe(false);
    expect(t.some((x) => x.hasAttribute('aria-describedby'))).toBe(false);

    expect(t.map((x) => x.querySelector('.tooltip')?.textContent)).toEqual(['20', '80']);
    await press(el, 0, 'ArrowRight');
    expect(thumbs(el)[0].querySelector('.tooltip')?.textContent).toBe('21');
  });
});

describe('mp-multi-range ARIA — value state transitions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-emits aria-valuenow after a programmatic value write, clamped to the bounds', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });
    expect(valueNow(el)).toEqual([20, 80]);

    el.value = [30, 70];
    await el.updateComplete;
    expect(valueNow(el)).toEqual([30, 70]);

    el.value = [-50, 500];
    await el.updateComplete;
    expect(valueNow(el)).toEqual([0, 100]);
  });

  it('re-emits aria-valuemin / aria-valuemax when the bounds change (property and attribute)', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuemin'))).toEqual(['0', '0']);
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuemax'))).toEqual(['100', '100']);

    el.min = -10;
    el.max = 10;
    el.value = [-5, 5];
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuemin'))).toEqual(['-10', '-10']);
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuemax'))).toEqual(['10', '10']);

    el.setAttribute('max', '20');
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuemax'))).toEqual(['20', '20']);
  });

  it('flips aria-orientation on every thumb when the orientation changes, and back', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });
    expect(thumbs(el).map((t) => t.getAttribute('aria-orientation'))).toEqual([
      'horizontal',
      'horizontal',
    ]);

    el.orientation = 'vertical';
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-orientation'))).toEqual([
      'vertical',
      'vertical',
    ]);

    el.setAttribute('orientation', 'horizontal');
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-orientation'))).toEqual([
      'horizontal',
      'horizontal',
    ]);
  });

  it('steps aria-valuenow up on ArrowRight and back down on ArrowLeft, leaving the sibling thumb alone', async () => {
    const el = await mount((host) => {
      host.step = 5;
      host.value = [20, 80];
    });

    await press(el, 0, 'ArrowRight');
    expect(valueNow(el)).toEqual([25, 80]);

    await press(el, 0, 'ArrowLeft');
    expect(valueNow(el)).toEqual([20, 80]);

    await press(el, 1, 'ArrowLeft');
    expect(valueNow(el)).toEqual([20, 75]);
  });

  it('steps aria-valuenow by ten steps on PageUp / PageDown', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });

    await press(el, 0, 'PageUp');
    expect(valueNow(el)).toEqual([30, 80]);

    await press(el, 0, 'PageDown');
    expect(valueNow(el)).toEqual([20, 80]);
  });

  it('snaps aria-valuenow back onto the step grid after a keyboard step from an off-grid value', async () => {
    // Programmatic writes are preserved verbatim within bounds (23 is not on the
    // grid); the first user interaction is what re-aligns the thumb.
    const el = await mount((host) => {
      host.step = 10;
      host.value = [23, 80];
    });
    expect(valueNow(el)).toEqual([23, 80]);

    await press(el, 0, 'ArrowRight');
    expect(valueNow(el)).toEqual([30, 80]);
  });
});

describe('mp-multi-range ARIA — thumbs clamp against each other', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('End on the lower thumb reports the upper thumb value, not aria-valuemax', async () => {
    const el = await mount((host) => {
      host.step = 5;
      host.value = [20, 60];
    });

    await press(el, 0, 'End');
    expect(valueNow(el)).toEqual([60, 60]);
    expect(thumbs(el)[0].getAttribute('aria-valuemax')).toBe('100');
  });

  it('Home on the upper thumb reports the lower thumb value, not aria-valuemin', async () => {
    const el = await mount((host) => {
      host.step = 5;
      host.value = [20, 60];
    });

    await press(el, 1, 'Home');
    expect(valueNow(el)).toEqual([20, 20]);
    expect(thumbs(el)[1].getAttribute('aria-valuemin')).toBe('0');
  });

  it('keeps minDistance between the reported values in both directions', async () => {
    const el = await mount((host) => {
      host.minDistance = 10;
      host.value = [20, 60];
    });

    await press(el, 0, 'End');
    expect(valueNow(el)).toEqual([50, 60]);

    // The gap is already at its minimum, so Home on the upper thumb cannot close it.
    await press(el, 1, 'Home');
    expect(valueNow(el)).toEqual([50, 60]);

    await press(el, 1, 'End');
    expect(valueNow(el)).toEqual([50, 100]);
  });
});

describe('mp-multi-range ARIA — valuetext and disabled', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds aria-valuetext only while formatValue is set, and keeps it in step with the value', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });
    expect(thumbs(el).some((t) => t.hasAttribute('aria-valuetext'))).toBe(false);

    el.formatValue = (v) => `${v} EUR`;
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuetext'))).toEqual(['20 EUR', '80 EUR']);

    await press(el, 0, 'ArrowRight');
    expect(thumbs(el)[0].getAttribute('aria-valuetext')).toBe('21 EUR');

    el.formatValue = null;
    await el.updateComplete;
    expect(thumbs(el).some((t) => t.hasAttribute('aria-valuetext'))).toBe(false);
  });

  it('marks thumbs aria-disabled (never natively disabled) and stops reporting new values, both directions', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
    });
    expect(thumbs(el).some((t) => t.hasAttribute('aria-disabled'))).toBe(false);

    el.disabled = true;
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-disabled'))).toEqual(['true', 'true']);
    // C6 decision: aria-disabled, not the native attribute, so a disabled slider
    // stays focusable and its values stay perceivable.
    expect(thumbs(el).some((t) => t.hasAttribute('disabled'))).toBe(false);

    await press(el, 0, 'ArrowRight');
    expect(valueNow(el)).toEqual([20, 80]);

    el.disabled = false;
    await el.updateComplete;
    expect(thumbs(el).some((t) => t.hasAttribute('aria-disabled'))).toBe(false);
    await press(el, 0, 'ArrowRight');
    expect(valueNow(el)).toEqual([21, 80]);
  });
});

describe('mint-multi-range thumb naming', () => {
  it('names a thumb pair Minimum/Maximum value by default', async () => {
    const el = await mount();
    expect(thumbs(el).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Minimum value',
      'Maximum value',
    ]);
  });

  it('names three or more thumbs positionally', async () => {
    const el = await mount((e) => (e.value = [10, 50, 90]));
    expect(thumbs(el).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Value 1 of 3',
      'Value 2 of 3',
      'Value 3 of 3',
    ]);
  });

  it('prefers consumer-set thumbLabels and reacts to a live write', async () => {
    const el = await mount();
    el.thumbLabels = ['Price floor', 'Price ceiling'];
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Price floor',
      'Price ceiling',
    ]);
    el.thumbLabels = null;
    await el.updateComplete;
    expect(thumbs(el)[0].getAttribute('aria-label')).toBe('Minimum value');
  });
});
