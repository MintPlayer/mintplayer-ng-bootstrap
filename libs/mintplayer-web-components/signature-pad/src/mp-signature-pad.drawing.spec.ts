import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-signature-pad.element';
import type { MpSignaturePadElement } from './mp-signature-pad.element';
import type { Signature } from './types/signature';
import { toBitmapPoint } from './canvas-point';

/**
 * Drawing and repainting. jsdom has no 2D context, so a recording context is
 * handed out by getContext: it invents no geometry, it only records the paint
 * calls the element makes, so what is asserted is the element's own output.
 */
type Call = [string, ...unknown[]];

function recordingContext(calls: Call[]): CanvasRenderingContext2D {
  const record = (name: string) => (...args: unknown[]) => {
    calls.push([name, ...args]);
  };
  return {
    clearRect: record('clearRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    fillText: record('fillText'),
    set font(v: string) {
      calls.push(['font', v]);
    },
    set fillStyle(_v: string) {
      /* colour is not under test */
    },
    set strokeStyle(_v: string) {
      /* colour is not under test */
    },
    set textBaseline(_v: string) {
      /* not under test */
    },
  } as unknown as CanvasRenderingContext2D;
}

async function mount(setup?: (el: MpSignaturePadElement) => void): Promise<MpSignaturePadElement> {
  const el = document.createElement('mp-signature-pad') as MpSignaturePadElement;
  setup?.(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const canvasOf = (el: MpSignaturePadElement) => el.shadowRoot!.querySelector('canvas')!;
const names = (calls: Call[]) => calls.map((c) => c[0]);

describe('mp-signature-pad drawing', () => {
  let el: MpSignaturePadElement;
  let calls: Call[];

  beforeEach(() => {
    calls = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => recordingContext(calls) as never,
    );
  });

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  it('a stroke is pointerdown, moves, and ends at the window pointerup', async () => {
    el = await mount();
    const events: Signature[] = [];
    el.addEventListener('signature-change', (e) => events.push((e as CustomEvent<Signature>).detail));
    const canvas = canvasOf(el);

    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true }));
    const up = new PointerEvent('pointerup', { cancelable: true });
    window.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);

    // After the pointer is released, moving no longer extends the stroke.
    const stray = new PointerEvent('pointermove', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(stray);
    expect(stray.defaultPrevented).toBe(false);

    expect(el.signature.strokes).toHaveLength(1);
    expect(el.signature.strokes[0].points).toHaveLength(3);
    expect(events).toHaveLength(3);
    // The incremental paint: one path begun, one segment stroked per move.
    expect(names(calls).filter((n) => n === 'lineTo')).toHaveLength(2);
    expect(names(calls).filter((n) => n === 'stroke')).toHaveLength(2);
  });

  it('a pointerup with no stroke in progress is left alone', async () => {
    el = await mount();
    const up = new PointerEvent('pointerup', { cancelable: true });
    window.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(false);
  });

  it('stops listening for pointerup on the window once disconnected', async () => {
    el = await mount();
    canvasOf(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.remove();
    const up = new PointerEvent('pointerup', { cancelable: true });
    window.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(false);
  });

  it('never mutates the signature object a consumer assigned', async () => {
    el = await mount();
    const saved: Signature = { strokes: [{ points: [{ x: 1, y: 1 }] }] };
    el.signature = saved;
    await el.updateComplete;
    const canvas = canvasOf(el);

    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    expect(saved).toEqual({ strokes: [{ points: [{ x: 1, y: 1 }] }] });
    expect(el.signature.strokes).toHaveLength(2);
  });

  it('never mutates a signature-change detail it already emitted', async () => {
    el = await mount();
    const events: Signature[] = [];
    el.addEventListener('signature-change', (e) => events.push((e as CustomEvent<Signature>).detail));
    const canvas = canvasOf(el);

    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    // Each emitted snapshot describes the pad at the moment it was sent.
    expect(events[0].strokes[0].points).toHaveLength(1);
    expect(events[1].strokes[0].points).toHaveLength(2);
  });

  it('repaints every stroke and the typed text from the model', async () => {
    el = await mount();
    calls.length = 0;
    el.signature = {
      strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }, { points: [] }],
      text: 'Ada',
    };
    await el.updateComplete;

    expect(calls[0]).toEqual(['clearRect', 0, 0, 500, 300]);
    expect(calls).toContainEqual(['moveTo', 1, 2]);
    expect(calls).toContainEqual(['lineTo', 3, 4]);
    // The empty stroke draws nothing: exactly one path for the one real stroke.
    expect(names(calls).filter((n) => n === 'beginPath')).toHaveLength(1);
    // Text: font sized to 35% of the height, capped at 64px, fitted inside 12px margins.
    expect(calls).toContainEqual(['font', '64px "Segoe Script", "Brush Script MT", cursive']);
    expect(calls).toContainEqual(['fillText', 'Ada', 12, 150, 476]);
  });

  it('scales the typed-signature font down on a short pad', async () => {
    el = await mount((host) => {
      host.height = 100;
    });
    el.signature = { strokes: [], text: 'x' };
    await el.updateComplete;
    expect(calls).toContainEqual(['font', '35px "Segoe Script", "Brush Script MT", cursive']);
  });

  it('typing repaints the canvas and clearing the text removes it from the model', async () => {
    el = await mount();
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));
    expect(calls).toContainEqual(['fillText', 'Grace', 12, 150, 476]);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(el.signature.text).toBeUndefined();
  });

  it('a resize repaints, because setting the bitmap size wipes it', async () => {
    el = await mount();
    el.signature = { strokes: [{ points: [{ x: 1, y: 1 }] }] };
    await el.updateComplete;
    calls.length = 0;
    el.width = 400;
    await el.updateComplete;
    expect(calls[0]).toEqual(['clearRect', 0, 0, 400, 300]);
  });

  it('the Undo and Clear buttons act on the model', async () => {
    el = await mount();
    el.signature = { strokes: [{ points: [{ x: 1, y: 1 }] }, { points: [{ x: 2, y: 2 }] }], text: 't' };
    await el.updateComplete;
    const [undo, clear] = Array.from(el.shadowRoot!.querySelectorAll('button'));
    undo.click();
    expect(el.signature.strokes).toHaveLength(1);
    clear.click();
    expect(el.signature).toEqual({ strokes: [] });
  });

  it('clear also empties a text-only signature', async () => {
    el = await mount();
    el.signature = { strokes: [], text: 'only text' };
    await el.updateComplete;
    el.clear();
    expect(el.signature).toEqual({ strokes: [] });
  });

  it('a null signature write resets to an empty model', async () => {
    el = await mount();
    el.signature = null;
    expect(el.signature).toEqual({ strokes: [] });
  });

  it('focus() falls back to the host when the typed input is switched off', async () => {
    el = await mount((host) => {
      host.showAccessibilityToggle = false;
      host.tabIndex = 0;
    });
    el.focus();
    expect(document.activeElement).toBe(el);
  });
});

describe('toBitmapPoint', () => {
  const bitmap = { width: 500, height: 300 };

  it('scales CSS pixels in a shrunk box up to bitmap pixels', () => {
    // A 500x300 bitmap shown in a 250x150 box at (10, 20).
    const box = { left: 10, top: 20, width: 250, height: 150 };
    expect(toBitmapPoint({ x: 110, y: 95 }, { x: 0, y: 0 }, box, bitmap)).toEqual({ x: 200, y: 150 });
  });

  it('is the identity for a box the size of the bitmap at the origin', () => {
    const box = { left: 0, top: 0, width: 500, height: 300 };
    expect(toBitmapPoint({ x: 42, y: 7 }, { x: 0, y: 0 }, box, bitmap)).toEqual({ x: 42, y: 7 });
  });

  it('falls back to the offset coordinates when the box has no width or no height', () => {
    const offset = { x: 3, y: 4 };
    expect(toBitmapPoint({ x: 99, y: 99 }, offset, { left: 0, top: 0, width: 0, height: 150 }, bitmap)).toEqual(offset);
    expect(toBitmapPoint({ x: 99, y: 99 }, offset, { left: 0, top: 0, width: 250, height: 0 }, bitmap)).toEqual(offset);
  });
});
