import { afterEach, describe, expect, it, vi } from 'vitest';
import './mint-multi-range.element';
import type { MintMultiRangeElement } from './mint-multi-range.element';

/**
 * Pointer and keyboard behaviour of `<mp-multi-range>` that does not depend
 * on layout. The pointer-to-value mapping itself is geometry and is tested as
 * the pure `pointerFraction` (pointer-geometry.spec.ts); what is here is the
 * gesture lifecycle around it. jsdom lays the track out at zero size, which is
 * exactly the collapsed-track case the element must survive.
 *
 * jsdom does not implement pointer capture, so the capture calls are stubbed
 * on the thumbs: the stub records which element captured, nothing geometric.
 */

async function mount(setup?: (el: MintMultiRangeElement) => void): Promise<MintMultiRangeElement> {
  const el = document.createElement('mp-multi-range') as MintMultiRangeElement;
  setup?.(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

const thumbs = (el: MintMultiRangeElement) =>
  [...el.shadowRoot!.querySelectorAll<HTMLElement>('.thumb')];
const track = (el: MintMultiRangeElement) => el.shadowRoot!.querySelector<HTMLElement>('.track')!;

function stubCapture(el: MintMultiRangeElement) {
  const captured = new Set<number>();
  thumbs(el).map((thumb) =>
    Object.assign(thumb, {
      setPointerCapture: vi.fn((id: number) => captured.add(id)),
      hasPointerCapture: vi.fn((id: number) => captured.has(id)),
      releasePointerCapture: vi.fn((id: number) => captured.delete(id)),
    })
  );
  return captured;
}

function pointer(type: string, target: EventTarget, init: { pointerId?: number; clientX?: number } = {}) {
  const event = new MouseEvent(type, { bubbles: true, composed: true, clientX: init.clientX ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
  return event;
}

function recordEvents(el: MintMultiRangeElement) {
  const events: { type: string; detail: number[] }[] = [];
  ['value-input', 'value-change'].map((type) =>
    el.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent<number[]>).detail }))
  );
  return events;
}

describe('mp-multi-range — pressing a collapsed track', () => {
  it('leaves the value alone and emits nothing when the track has no length', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const events = recordEvents(el);
    pointer('pointerdown', track(el), { clientX: 50 });
    await el.updateComplete;
    expect(el.value).toEqual([20, 80]);
    expect(events).toEqual([]);
    expect(thumbs(el).map((t) => t.getAttribute('aria-valuenow'))).toEqual(['20', '80']);
  });

  it('does not start a drag from a press on a collapsed track', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    stubCapture(el);
    pointer('pointerdown', track(el), { clientX: 50 });
    await el.updateComplete;
    expect(thumbs(el).map((t) => t.getAttribute('data-dragging'))).toEqual(['false', 'false']);
  });
});

describe('mp-multi-range — thumb drag lifecycle', () => {
  it('pressing a thumb captures the pointer, focuses it and marks it dragging', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const captured = stubCapture(el);
    pointer('pointerdown', thumbs(el)[1], { pointerId: 7 });
    await el.updateComplete;
    expect(captured.has(7)).toBe(true);
    expect(el.shadowRoot!.activeElement).toBe(thumbs(el)[1]);
    expect(thumbs(el).map((t) => t.getAttribute('data-dragging'))).toEqual(['false', 'true']);
  });

  it('a thumb press does not also count as a track press', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    stubCapture(el);
    const events = recordEvents(el);
    pointer('pointerdown', thumbs(el)[0]);
    await el.updateComplete;
    expect(events).toEqual([]);
  });

  it('releasing commits with value-change, releases capture and clears the dragging state', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const captured = stubCapture(el);
    const events = recordEvents(el);
    pointer('pointerdown', thumbs(el)[0], { pointerId: 3 });
    await el.updateComplete;
    pointer('pointerup', thumbs(el)[0], { pointerId: 3 });
    await el.updateComplete;
    expect(captured.has(3)).toBe(false);
    expect(events).toEqual([{ type: 'value-change', detail: [20, 80] }]);
    expect(thumbs(el).map((t) => t.getAttribute('data-dragging'))).toEqual(['false', 'false']);
  });

  it('pointercancel ends the drag the same way', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    stubCapture(el);
    const events = recordEvents(el);
    pointer('pointerdown', thumbs(el)[1], { pointerId: 4 });
    await el.updateComplete;
    pointer('pointercancel', thumbs(el)[1], { pointerId: 4 });
    await el.updateComplete;
    expect(events.map((e) => e.type)).toEqual(['value-change']);
    expect(thumbs(el)[1].getAttribute('data-dragging')).toBe('false');
  });

  it('ignores moves and releases from another pointer', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    stubCapture(el);
    const events = recordEvents(el);
    pointer('pointerdown', thumbs(el)[0], { pointerId: 1 });
    await el.updateComplete;
    pointer('pointermove', thumbs(el)[0], { pointerId: 2, clientX: 90 });
    pointer('pointerup', thumbs(el)[0], { pointerId: 2 });
    await el.updateComplete;
    expect(events).toEqual([]);
    expect(thumbs(el)[0].getAttribute('data-dragging')).toBe('true');
  });

  it('a move over a collapsed track keeps the thumb where it is', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    stubCapture(el);
    const events = recordEvents(el);
    pointer('pointerdown', thumbs(el)[0], { pointerId: 1 });
    pointer('pointermove', thumbs(el)[0], { pointerId: 1, clientX: 90 });
    await el.updateComplete;
    expect(el.value).toEqual([20, 80]);
    expect(events).toEqual([]);
  });

  it('moves and releases with no drag in progress are ignored', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const events = recordEvents(el);
    pointer('pointermove', track(el), { clientX: 90 });
    pointer('pointerup', track(el));
    expect(events).toEqual([]);
  });

  it('a disabled slider ignores thumb and track presses', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
      host.disabled = true;
    });
    const captured = stubCapture(el);
    pointer('pointerdown', thumbs(el)[0]);
    pointer('pointerdown', track(el));
    await el.updateComplete;
    expect(captured.size).toBe(0);
    expect(thumbs(el)[0].getAttribute('data-dragging')).toBe('false');
  });
});

describe('mp-multi-range — keyboard direction and fallbacks', () => {
  const press = async (el: MintMultiRangeElement, index: number, key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    thumbs(el)[index].dispatchEvent(event);
    await el.updateComplete;
    return event;
  };

  it('flips ArrowLeft / ArrowRight in RTL', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    el.style.direction = 'rtl';
    await press(el, 0, 'ArrowRight');
    expect(el.value).toEqual([19, 80]);
    await press(el, 0, 'ArrowLeft');
    expect(el.value).toEqual([20, 80]);
  });

  it('does not flip a vertical slider in RTL; ArrowUp / ArrowDown step it', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
      host.orientation = 'vertical';
    });
    el.style.direction = 'rtl';
    await press(el, 0, 'ArrowRight');
    expect(el.value).toEqual([21, 80]);
    await press(el, 0, 'ArrowUp');
    expect(el.value).toEqual([22, 80]);
    await press(el, 0, 'ArrowDown');
    expect(el.value).toEqual([21, 80]);
  });

  it('leaves unbound keys to the page', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    expect((await press(el, 0, 'a')).defaultPrevented).toBe(false);
    expect(el.value).toEqual([20, 80]);
  });

  it('a key that cannot move the thumb emits nothing', async () => {
    const el = await mount((host) => (host.value = [0, 80]));
    const events = recordEvents(el);
    expect((await press(el, 0, 'Home')).defaultPrevented).toBe(true);
    expect(events).toEqual([]);
  });

  it('steps by 1 and does not snap when step is 0', async () => {
    const el = await mount((host) => {
      host.step = 0;
      host.value = [20.5, 80];
    });
    await press(el, 0, 'ArrowRight');
    expect(el.value).toEqual([21.5, 80]);
  });

  it('emits value-input then value-change for each keyboard step', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const events = recordEvents(el);
    await press(el, 1, 'ArrowLeft');
    expect(events).toEqual([
      { type: 'value-input', detail: [20, 79] },
      { type: 'value-change', detail: [20, 79] },
    ]);
  });
});

describe('mp-multi-range — value and rendering fallbacks', () => {
  it('defaults to one thumb at each bound, and an empty write restores that', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    el.value = [];
    await el.updateComplete;
    expect(el.value).toEqual([0, 100]);
    el.value = null;
    expect(el.value).toEqual([0, 100]);
  });

  it('getValues returns a copy, not the live array', async () => {
    const el = await mount((host) => (host.value = [20, 80]));
    const copy = el.getValues();
    copy[0] = 99;
    expect(el.value).toEqual([20, 80]);
  });

  it('falls back to the plain number when formatValue throws', async () => {
    const el = await mount((host) => {
      host.value = [20, 80];
      host.formatValue = () => {
        throw new Error('bad formatter');
      };
    });
    expect(thumbs(el).map((t) => t.querySelector('.tooltip')!.textContent)).toEqual(['20', '80']);
  });

  it('places every thumb at the start of an empty range (min = max)', async () => {
    const el = await mount((host) => {
      host.min = 50;
      host.max = 50;
      host.value = [50, 50];
    });
    expect(thumbs(el).map((t) => t.getAttribute('style'))).toEqual([
      'inset-inline-start: 0%;',
      'inset-inline-start: 0%;',
    ]);
  });

  it('positions thumbs and fill from the bottom when vertical', async () => {
    const el = await mount((host) => {
      host.orientation = 'vertical';
      host.value = [20, 80];
    });
    expect(thumbs(el)[1].getAttribute('style')).toBe('bottom: 80%;');
    expect(el.shadowRoot!.querySelector('.fill')!.getAttribute('style')).toBe('bottom: 20%; height: 60%;');
  });
});
