import { afterEach, describe, expect, it } from 'vitest';
import './mp-signature-pad.element';
import type { MpSignaturePadElement } from './mp-signature-pad.element';
import type { Signature } from './types/signature';

async function mount(setup?: (el: MpSignaturePadElement) => void): Promise<MpSignaturePadElement> {
  const el = document.createElement('mp-signature-pad') as MpSignaturePadElement;
  setup?.(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function shadow(el: MpSignaturePadElement): ShadowRoot {
  return el.shadowRoot!;
}

const drawn = (): Signature => ({ strokes: [{ points: [{ x: 1, y: 1 }, { x: 5, y: 5 }] }] });

describe('mp-signature-pad — structure & naming', () => {
  let el: MpSignaturePadElement;
  afterEach(() => el.remove());

  it('canvas is role="img" with the default label', async () => {
    el = await mount();
    const canvas = shadow(el).querySelector('canvas')!;
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Signature pad');
  });

  it('typed input and Undo/Clear buttons are real, labeled, tab-order controls', async () => {
    el = await mount();
    const input = shadow(el).querySelector('input.form-control') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Type your signature');
    expect(input.disabled).toBe(false);
    const buttons = Array.from(shadow(el).querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Undo', 'Clear']);
    expect(buttons.every((b) => !b.disabled)).toBe(true);
  });

  it('focus() lands on the typed input — the keyboard entry point', async () => {
    el = await mount();
    el.focus();
    expect(shadow(el).activeElement).toBe(shadow(el).querySelector('input.form-control'));
  });

  it('labels are overridable via attributes', async () => {
    el = await mount((host) => {
      host.setAttribute('input-label', 'Handtekening');
      host.setAttribute('type-label', 'Typ je handtekening');
      host.setAttribute('undo-label', 'Ongedaan maken');
      host.setAttribute('clear-label', 'Wissen');
    });
    expect(shadow(el).querySelector('canvas')!.getAttribute('aria-label')).toBe('Handtekening');
    expect(shadow(el).querySelector('input')!.getAttribute('aria-label')).toBe('Typ je handtekening');
    const buttons = Array.from(shadow(el).querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Ongedaan maken', 'Wissen']);
  });
});

describe('mp-signature-pad — typed alternative & model', () => {
  let el: MpSignaturePadElement;
  afterEach(() => el.remove());

  it('typing stores the text on the signature model and emits signature-change', async () => {
    el = await mount();
    const events: Signature[] = [];
    el.addEventListener('signature-change', (e) => events.push((e as CustomEvent<Signature>).detail));
    const input = shadow(el).querySelector('input') as HTMLInputElement;
    input.value = 'Ada Lovelace';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.signature.text).toBe('Ada Lovelace');
    expect(events.at(-1)?.text).toBe('Ada Lovelace');
  });

  it('a programmatic signature write reflects the text into the input', async () => {
    el = await mount();
    el.signature = { strokes: [], text: 'Grace Hopper' };
    await el.updateComplete;
    expect((shadow(el).querySelector('input') as HTMLInputElement).value).toBe('Grace Hopper');
  });

  it('undo removes the last stroke only', async () => {
    el = await mount();
    el.signature = { strokes: [...drawn().strokes, ...drawn().strokes], text: 'kept' };
    await el.updateComplete;
    el.undo();
    expect(el.signature.strokes.length).toBe(1);
    expect(el.signature.text).toBe('kept');
  });

  it('clear empties strokes and text, and reflects in the input', async () => {
    el = await mount();
    el.signature = { ...drawn(), text: 'gone' };
    await el.updateComplete;
    el.clear();
    await el.updateComplete;
    expect(el.signature).toEqual({ strokes: [] });
    expect((shadow(el).querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('undo/clear on an empty pad are no-ops and emit nothing', async () => {
    el = await mount();
    const events: unknown[] = [];
    el.addEventListener('signature-change', (e) => events.push(e));
    el.undo();
    el.clear();
    expect(events.length).toBe(0);
  });

  it('pointerdown on the canvas starts a stroke and emits', async () => {
    el = await mount();
    const events: Signature[] = [];
    el.addEventListener('signature-change', (e) => events.push((e as CustomEvent<Signature>).detail));
    const canvas = shadow(el).querySelector('canvas')!;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    // jsdom has no canvas 2d context, so the incremental paint is skipped, but
    // the model mutation + event contract must hold regardless of the context.
    expect(el.signature.strokes.length).toBe(1);
    expect(events.length).toBe(1);
  });
});

describe('mp-signature-pad — CSS-scaled canvas coordinate mapping', () => {
  let el: MpSignaturePadElement;
  afterEach(() => el.remove());

  it('maps pointer coordinates from rendered CSS pixels to bitmap pixels', async () => {
    el = await mount((host) => {
      host.width = 500;
      host.height = 300;
    });
    const canvas = shadow(el).querySelector('canvas')!;
    // Simulate `width: 100%` shrinking the 500x300 bitmap to a 250x150 box at (10, 20).
    canvas.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 250, height: 150, right: 260, bottom: 170, x: 10, y: 20, toJSON: () => ({}) }) as DOMRect;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 110, clientY: 95 }));
    // (110-10) CSS px * (500/250) = 200 bitmap px; (95-20) * (300/150) = 150.
    expect(el.signature.strokes[0].points[0]).toEqual({ x: 200, y: 150 });
  });

  it('falls back to offsetX/offsetY when the canvas has no layout (rect 0x0)', async () => {
    el = await mount();
    const canvas = shadow(el).querySelector('canvas')!;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(el.signature.strokes.length).toBe(1);
  });
});

describe('mp-signature-pad — showAccessibilityToggle (opt-OUT of the keyboard path)', () => {
  let el: MpSignaturePadElement;
  afterEach(() => el.remove());

  it('the typed input is present by default — it is the only keyboard path', async () => {
    el = await mount();
    expect(shadow(el).querySelector('input.form-control')).not.toBeNull();
  });

  it('show-accessibility-toggle="false" removes the input but keeps Undo/Clear in the tab order', async () => {
    el = await mount((host) => host.setAttribute('show-accessibility-toggle', 'false'));
    expect(shadow(el).querySelector('input.form-control')).toBeNull();
    expect(shadow(el).querySelectorAll('button').length).toBe(2);
  });

  it('bare attribute presence still means true (only an explicit "false" disables)', async () => {
    el = await mount((host) => host.setAttribute('show-accessibility-toggle', ''));
    expect(shadow(el).querySelector('input.form-control')).not.toBeNull();
  });

  it('flipping the property live restores the input (state is live, PRD 11a)', async () => {
    el = await mount((host) => host.setAttribute('show-accessibility-toggle', 'false'));
    el.showAccessibilityToggle = true;
    await el.updateComplete;
    expect(shadow(el).querySelector('input.form-control')).not.toBeNull();
  });
});
