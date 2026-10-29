import { describe, expect, it } from 'vitest';
import {
  connectSignaturePad,
  emptySignature,
  isEmptySignature,
  toBitmapPoint,
  typedFontSize,
  type SignaturePadOptions,
} from './signature-pad';

const options = (over: Partial<SignaturePadOptions> = {}): SignaturePadOptions => ({
  id: 'sp',
  signature: emptySignature(),
  width: 500,
  height: 300,
  showAccessibilityToggle: true,
  disabled: false,
  required: false,
  invalid: false,
  errorText: null,
  hydrated: true,
  label: null,
  ...over,
});

describe('connectSignaturePad', () => {
  it('names the canvas and the controls, every node scoped', () => {
    const view = connectSignaturePad(options());
    expect(view.canvas).toMatchObject({ role: 'img', 'aria-label': 'Signature pad', width: 500, height: 300 });
    expect(view.typed).toMatchObject({ id: 'sp-text', 'aria-label': 'Type your signature' });
    expect([view.undoText, view.clearText]).toEqual(['Undo', 'Clear']);
    for (const bag of [view.root, view.canvas, view.controls, view.typed!, view.undo, view.clear]) {
      expect(bag['data-mps']).toBeUndefined();
    }
  });

  it('a consumer label wins for the canvas; labels localise the rest', () => {
    const view = connectSignaturePad(options({ label: 'Handtekening', labels: { undo: 'Ongedaan maken' } }));
    expect(view.canvas['aria-label']).toBe('Handtekening');
    expect(view.undoText).toBe('Ongedaan maken');
    expect(view.clearText).toBe('Clear');
  });

  it('every control is disabled before hydration and while disabled — never for being empty', () => {
    expect(connectSignaturePad(options()).undo['disabled']).toBeFalsy();
    for (const view of [connectSignaturePad(options({ hydrated: false })), connectSignaturePad(options({ disabled: true }))]) {
      expect(view.typed!['disabled']).toBe(true);
      expect(view.undo['disabled']).toBe(true);
      expect(view.clear['disabled']).toBe(true);
    }
  });

  it('drops the typed field when the toggle is off', () => {
    expect(connectSignaturePad(options({ showAccessibilityToggle: false })).typed).toBeNull();
  });

  it('an error describes the typed field, or the canvas without one', () => {
    const view = connectSignaturePad(options({ invalid: true, errorText: 'Please sign', required: true }));
    expect(view.showFeedback).toBe(true);
    expect(view.feedback.text).toBe('Please sign');
    expect(view.typed).toMatchObject({ 'aria-invalid': 'true', required: true });
    expect(String(view.typed!['aria-describedby'])).toContain('sp-error');
    expect(view.root['class']).toContain('mp-signature-pad-invalid');
    const bare = connectSignaturePad(options({ invalid: true, errorText: 'Please sign', showAccessibilityToggle: false }));
    expect(String(bare.canvas['aria-describedby'])).toContain('sp-error');
  });

  it('no message without invalid', () => {
    expect(connectSignaturePad(options({ errorText: 'Please sign' })).showFeedback).toBe(false);
  });
});

describe('helpers', () => {
  it('toBitmapPoint scales a CSS-sized box into the bitmap', () => {
    const box = { left: 10, top: 20, width: 250, height: 150 };
    expect(toBitmapPoint({ x: 60, y: 95 }, { x: 0, y: 0 }, box, { width: 500, height: 300 })).toEqual({ x: 100, y: 150 });
  });

  it('toBitmapPoint falls back to the offset when the box has no area', () => {
    expect(toBitmapPoint({ x: 60, y: 95 }, { x: 7, y: 8 }, { left: 0, top: 0, width: 0, height: 0 }, { width: 500, height: 300 })).toEqual({ x: 7, y: 8 });
  });

  it('typedFontSize grows with the pad and caps at 64px', () => {
    expect(typedFontSize(100)).toBeCloseTo(35);
    expect(typedFontSize(1000)).toBe(64);
  });

  it('isEmptySignature: no strokes and no text', () => {
    expect(isEmptySignature(null)).toBe(true);
    expect(isEmptySignature({ strokes: [] })).toBe(true);
    expect(isEmptySignature({ strokes: [], text: 'A' })).toBe(false);
    expect(isEmptySignature({ strokes: [{ points: [] }] })).toBe(false);
  });
});
