import { describe, expect, it } from 'vitest';
import { connectSplitter, connectSplitterPanel, dividerValues, dragSizes, keySizes, rescaleSizes } from './splitter';

describe('connectSplitter', () => {
  it('classes the root by orientation, touch mode and an in-flight drag', () => {
    const view = connectSplitter({ orientation: 'vertical', touchMode: true, resizing: true, hydrated: true });
    expect(view.root['class']).toBe('splitter vertical touch-mode resizing');
    expect(view.root['data-mps']).toBeUndefined();
  });
});

describe('connectSplitterPanel', () => {
  it('renders a static separator on the server and a focusable one once live', () => {
    const server = connectSplitterPanel({ id: 'p1', orientation: 'horizontal', hydrated: false });
    expect(server.divider).toMatchObject({ role: 'separator', 'aria-orientation': 'vertical', tabindex: null });
    expect(server.pane['id']).toBe('p1-pane');
    expect(connectSplitterPanel({ id: 'p1', orientation: 'vertical', hydrated: true }).divider).toMatchObject({
      'aria-orientation': 'horizontal',
      tabindex: 0,
    });
  });
});

describe('dragSizes', () => {
  it('moves space between the pair', () => {
    expect(dragSizes([300, 300, 200], 1, 50, 50)).toEqual([300, 350, 150]);
  });

  it('keeps both sides at the minimum', () => {
    expect(dragSizes([300, 300], 0, -400, 50)).toEqual([50, 550]);
    expect(dragSizes([300, 300], 0, 400, 50)).toEqual([550, 50]);
  });
});

describe('keySizes', () => {
  const options = { orientation: 'horizontal' as const, total: 1000, min: 50, fine: false };

  it('steps 10%, or 1% when fine', () => {
    expect(keySizes([500, 500], 0, 'ArrowRight', options)).toEqual([600, 400]);
    expect(keySizes([500, 500], 0, 'ArrowLeft', { ...options, fine: true })).toEqual([490, 510]);
  });

  it('ignores the off-axis arrows and unknown keys', () => {
    expect(keySizes([500, 500], 0, 'ArrowDown', options)).toBeNull();
    expect(keySizes([500, 500], 0, 'x', options)).toBeNull();
    expect(keySizes([500, 500], 0, 'ArrowDown', { ...options, orientation: 'vertical' })).toEqual([600, 400]);
  });

  it('Home and End go to the limits; a move past one clamps; nothing to do is null', () => {
    expect(keySizes([500, 500], 0, 'Home', options)).toEqual([50, 950]);
    expect(keySizes([500, 500], 0, 'End', options)).toEqual([950, 50]);
    expect(keySizes([100, 900], 0, 'ArrowLeft', options)).toEqual([50, 950]);
    expect(keySizes([50, 950], 0, 'Home', options)).toBeNull();
  });

  it('is null without a pair or a size', () => {
    expect(keySizes([500, 500], 1, 'ArrowRight', options)).toBeNull();
    expect(keySizes([500, 500], 0, 'ArrowRight', { ...options, total: 0 })).toBeNull();
  });
});

describe('rescaleSizes', () => {
  it('keeps the ratios', () => {
    expect(rescaleSizes([100, 300], 800)).toEqual([200, 600]);
  });

  it('does nothing below 1px, without a ratio, or for a non-finite space', () => {
    expect(rescaleSizes([100, 300], 400.5)).toBeNull();
    expect(rescaleSizes([0, 0], 400)).toBeNull();
    expect(rescaleSizes([], 400)).toBeNull();
    expect(rescaleSizes([100, 300], NaN)).toBeNull();
  });

  it('treats a negative space as 0', () => {
    expect(rescaleSizes([100, 300], -5)).toEqual([0, 0]);
  });
});

describe('dividerValues', () => {
  it('reports percent of the whole, with the pair as text', () => {
    expect(dividerValues([200, 600], 0, 800, 40)).toEqual({
      'aria-valuenow': 25,
      'aria-valuemin': 5,
      'aria-valuemax': 95,
      'aria-valuetext': '25% / 75%',
    });
    expect(dividerValues([200, 600], 1, 800, 40)).toBeNull();
  });
});
