import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MpSignaturePad, type Signature } from './index';

void MpSignaturePad; // force the side-effect registration

/**
 * The Lit signature pad front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/signature-pad`. The core's spec covers
 * the bags and the coordinate mapping; this file pins the element: drawing,
 * the typed alternative, Undo / Clear and the model.
 *
 * jsdom has no 2D context, so a recording context is handed out by
 * getContext: it invents no geometry, it only records the paint calls.
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

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function settle(el: MpSignaturePad): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
  await frame();
}

let calls: Call[];

beforeEach(() => {
  calls = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext(calls) as never);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(setup: (el: MpSignaturePad) => void = () => undefined): Promise<MpSignaturePad> {
  const el = document.createElement('mp-signature-pad') as MpSignaturePad;
  setup(el);
  document.body.append(el);
  await settle(el);
  return el;
}

const canvas = (el: MpSignaturePad) => el.querySelector('canvas') as HTMLCanvasElement;
const typed = (el: MpSignaturePad) => el.querySelector('input.signature-pad-text') as HTMLInputElement | null;
const button = (el: MpSignaturePad, kind: 'undo' | 'clear') => el.querySelector(`.signature-pad-${kind}`) as HTMLButtonElement;
const changes = (el: MpSignaturePad) => {
  const seen: Signature[] = [];
  el.addEventListener('signaturechange', (e) => seen.push((e as CustomEvent<Signature>).detail));
  return seen;
};
const pointer = (target: EventTarget, type: string, x: number, y: number, pointerId = 1) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }) as MouseEvent & { pointerId: number };
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'offsetX', { value: x });
  Object.defineProperty(event, 'offsetY', { value: y });
  target.dispatchEvent(event);
};

describe('mp-signature-pad — structure and naming', () => {
  it('renders in the light DOM: a named canvas, the typed field and real buttons', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(canvas(el).getAttribute('role')).toBe('img');
    expect(canvas(el).getAttribute('aria-label')).toBe('Signature pad');
    expect(canvas(el).width).toBe(500);
    expect(canvas(el).height).toBe(300);
    expect(typed(el)?.getAttribute('aria-label')).toBe('Type your signature');
    expect(button(el, 'undo').textContent).toBe('Undo');
    expect(button(el, 'clear').textContent).toBe('Clear');
    expect(button(el, 'undo').type).toBe('button');
  });

  it('takes inputLabel for the canvas, and labels for the controls', async () => {
    const el = await mount((e) => {
      e.inputLabel = 'Handtekening';
      e.labels = { type: 'Typ uw handtekening', undo: 'Ongedaan maken', clear: 'Wissen' };
    });
    expect(canvas(el).getAttribute('aria-label')).toBe('Handtekening');
    expect(typed(el)?.placeholder).toBe('Typ uw handtekening');
    expect(button(el, 'undo').textContent).toBe('Ongedaan maken');
    expect(button(el, 'clear').textContent).toBe('Wissen');
  });

  it('drops the typed field when showAccessibilityToggle is off, keeping the buttons', async () => {
    const el = await mount((e) => (e.showAccessibilityToggle = false));
    expect(typed(el)).toBeNull();
    expect(button(el, 'undo')).not.toBeNull();
    el.showAccessibilityToggle = true;
    await settle(el);
    expect(typed(el)).not.toBeNull();
  });

  it('focusInput() lands on the typed field', async () => {
    const el = await mount();
    el.focusInput();
    expect(document.activeElement).toBe(typed(el));
  });

  it('disables every control, and draws nothing, while disabled', async () => {
    const el = await mount((e) => (e.disabled = true));
    const seen = changes(el);
    expect(typed(el)?.disabled).toBe(true);
    expect(button(el, 'undo').disabled).toBe(true);
    expect(button(el, 'clear').disabled).toBe(true);
    pointer(canvas(el), 'pointerdown', 10, 10);
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('renders the error text as the typed field’s description', async () => {
    const el = await mount((e) => {
      e.invalid = true;
      e.errorText = 'Please sign';
    });
    const feedback = el.querySelector('.invalid-feedback') as HTMLElement;
    expect(feedback.textContent).toBe('Please sign');
    expect(typed(el)?.getAttribute('aria-invalid')).toBe('true');
    expect(typed(el)?.getAttribute('aria-describedby')).toContain(feedback.id);
  });
});

describe('mp-signature-pad — drawing', () => {
  it('a stroke is a pointerdown and moves, each point reported', async () => {
    const el = await mount();
    const seen = changes(el);
    pointer(canvas(el), 'pointerdown', 10, 20);
    pointer(canvas(el), 'pointermove', 30, 40);
    pointer(canvas(el), 'pointerup', 30, 40);
    pointer(canvas(el), 'pointermove', 50, 60);
    await settle(el);
    expect(seen).toHaveLength(2);
    expect(el.signature.strokes).toEqual([{ points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }]);
    expect(calls.filter((c) => c[0] === 'lineTo')).toEqual([['lineTo', 30, 40]]);
  });

  it('never mutates the signature a consumer assigned, nor a detail it emitted', async () => {
    const mine: Signature = { strokes: [{ points: [{ x: 1, y: 1 }] }] };
    const el = await mount((e) => (e.signature = mine));
    const seen = changes(el);
    pointer(canvas(el), 'pointerdown', 10, 10);
    const first = seen[0];
    pointer(canvas(el), 'pointermove', 20, 20);
    await settle(el);
    expect(mine.strokes).toHaveLength(1);
    expect(first.strokes[1].points).toHaveLength(1);
  });

  it('repaints every stroke and the typed text from a written model', async () => {
    const el = await mount();
    calls.length = 0;
    el.signature = { strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }], text: 'Ada' };
    await settle(el);
    expect(calls.map((c) => c[0])).toEqual(['clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'font', 'fillText']);
    expect(typed(el)?.value).toBe('Ada');
  });

  it('a resize repaints, because setting the bitmap size wipes it', async () => {
    const el = await mount((e) => (e.signature = { strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }] }));
    calls.length = 0;
    el.width = 320;
    await settle(el);
    expect(canvas(el).width).toBe(320);
    expect(calls.map((c) => c[0])).toContain('lineTo');
  });
});

describe('mp-signature-pad — typed alternative, Undo and Clear', () => {
  it('typing stores the text and repaints; emptying it removes the text', async () => {
    const el = await mount();
    const seen = changes(el);
    const field = typed(el)!;
    field.value = 'Ada Lovelace';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(seen.at(-1)?.text).toBe('Ada Lovelace');
    expect(calls.some((c) => c[0] === 'fillText' && c[1] === 'Ada Lovelace')).toBe(true);
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(seen.at(-1)?.text).toBeUndefined();
  });

  it('Undo removes the last stroke; Clear empties strokes and text', async () => {
    const el = await mount((e) => (e.signature = { strokes: [{ points: [{ x: 1, y: 1 }] }, { points: [{ x: 2, y: 2 }] }], text: 'Ada' }));
    const seen = changes(el);
    button(el, 'undo').click();
    await settle(el);
    expect(el.signature.strokes).toEqual([{ points: [{ x: 1, y: 1 }] }]);
    button(el, 'clear').click();
    await settle(el);
    expect(el.signature).toEqual({ strokes: [] });
    expect(typed(el)?.value).toBe('');
    expect(seen).toHaveLength(2);
  });

  it('Undo and Clear on an empty pad emit nothing', async () => {
    const el = await mount();
    const seen = changes(el);
    button(el, 'undo').click();
    button(el, 'clear').click();
    el.undo();
    el.clear();
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('Clear empties a text-only signature too', async () => {
    const el = await mount((e) => (e.signature = { strokes: [], text: 'Ada' }));
    el.clear();
    await settle(el);
    expect(el.signature).toEqual({ strokes: [] });
  });
});
