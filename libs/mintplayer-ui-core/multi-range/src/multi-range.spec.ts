import {
  connectMultiRange,
  constrainThumb,
  nearestThumbIndex,
  normaliseValues,
  pointerFraction,
  snapToStep,
  thumbName,
  type MultiRangeOptions,
} from './multi-range';

const base: MultiRangeOptions = {
  id: 'r1',
  values: [20, 80],
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  disabled: false,
  name: null,
  label: null,
  thumbLabels: null,
  format: null,
  active: null,
};

describe('value math', () => {
  it('normalises: clamps, sorts, and falls back to [min, max]', () => {
    expect(normaliseValues([120, -5, 40], 0, 100)).toEqual([0, 40, 100]);
    expect(normaliseValues(null, 0, 10)).toEqual([0, 10]);
    expect(normaliseValues([], 0, 10)).toEqual([0, 10]);
  });

  it('snaps to the step from min without float noise', () => {
    expect(snapToStep(0.29, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(7, 1, 10, 3)).toBe(7);
    expect(snapToStep(8.4, 1, 10, 3)).toBe(7);
    expect(snapToStep(42.4, 0, 100, 0)).toBe(42.4);
  });

  it('keeps a thumb between its neighbours, minDistance apart', () => {
    expect(constrainThumb([20, 50, 80], 1, 90, 0, 100, 0)).toBe(80);
    expect(constrainThumb([20, 50, 80], 1, 10, 0, 100, 5)).toBe(25);
    expect(constrainThumb([20, 80], 0, -10, 0, 100, 0)).toBe(0);
  });
});

describe('pointer mapping', () => {
  const rect = { left: 100, right: 300, bottom: 50, width: 200, height: 40 };

  it('measures from the inline start, flipped in RTL, from the bottom when vertical', () => {
    expect(pointerFraction(rect, 150, 0, { vertical: false, rtl: false })).toBe(0.25);
    expect(pointerFraction(rect, 150, 0, { vertical: false, rtl: true })).toBe(0.75);
    expect(pointerFraction(rect, 0, 40, { vertical: true, rtl: false })).toBe(0.25);
    expect(pointerFraction(rect, 999, 0, { vertical: false, rtl: false })).toBe(1);
  });

  it('has no position on a collapsed track', () => {
    expect(pointerFraction({ ...rect, width: 0 }, 150, 0, { vertical: false, rtl: false })).toBeNull();
  });

  it('picks the nearest thumb, breaking a stack toward the target', () => {
    expect(nearestThumbIndex([20, 80], 70)).toBe(1);
    expect(nearestThumbIndex([50, 50], 60)).toBe(1);
    expect(nearestThumbIndex([50, 50], 40)).toBe(0);
  });
});

describe('thumbName', () => {
  it('names a pair Minimum/Maximum and more thumbs by position', () => {
    expect(thumbName(0, 2, null)).toBe('Minimum value');
    expect(thumbName(1, 2, null)).toBe('Maximum value');
    expect(thumbName(1, 3, null)).toBe('Value 2 of 3');
    expect(thumbName(1, 3, ['a', 'Middle'])).toBe('Middle');
  });
});

describe('connectMultiRange', () => {
  it('renders one native range input per thumb, named and bounded', () => {
    const view = connectMultiRange({ ...base, name: 'price' });
    expect(view.thumbs).toHaveLength(2);
    const input = view.thumbs[1].input;
    expect(input['type']).toBe('range');
    expect(input['name']).toBe('price');
    expect([input['min'], input['max'], input['step'], input['value']]).toEqual([0, 100, 1, 80]);
    expect(input['aria-label']).toBe('Maximum value');
    expect(input['aria-orientation']).toBeNull();
  });

  it('names the group, and marks the vertical orientation on each thumb', () => {
    const view = connectMultiRange({ ...base, label: 'Price', orientation: 'vertical' });
    expect(view.root['role']).toBe('group');
    expect(view.root['aria-label']).toBe('Price');
    expect(view.root['class']).toContain('mp-multi-range-vertical');
    expect(view.thumbs[0].input['aria-orientation']).toBe('vertical');
  });

  it('places fills and tooltips with fraction custom properties', () => {
    const view = connectMultiRange({ ...base, values: [25, 50, 75] });
    expect(view.fills.map((f) => f.geometry)).toEqual([
      { '--mp-multi-range-from': '0.25', '--mp-multi-range-to': '0.5' },
      { '--mp-multi-range-from': '0.5', '--mp-multi-range-to': '0.75' },
    ]);
    expect(view.thumbs[2].position).toEqual({ '--mp-multi-range-at': '0.75' });
  });

  it('formats the tooltip and aria-valuetext, and falls back when the formatter throws', () => {
    const money = connectMultiRange({ ...base, format: (v) => `$${v}` });
    expect(money.thumbs[0].text).toBe('$20');
    expect(money.thumbs[0].input['aria-valuetext']).toBe('$20');
    const broken = connectMultiRange({ ...base, format: () => { throw new Error('x'); } });
    expect(broken.thumbs[0].text).toBe('20');
    expect(connectMultiRange(base).thumbs[0].input['aria-valuetext']).toBeNull();
  });

  it('raises the moving thumb, and a stacked thumb in the upper half', () => {
    const raised = (o: Partial<MultiRangeOptions>) =>
      connectMultiRange({ ...base, ...o }).thumbs.map((t) => String(t.input['class']).includes('multi-range-thumb-raised'));
    expect(raised({ active: 1 })).toEqual([false, true]);
    expect(raised({ values: [90, 90] })).toEqual([true, false]);
    expect(raised({ values: [10, 10] })).toEqual([false, false]);
  });

  it('disables every thumb, no node scoped by the core (S15)', () => {
    const view = connectMultiRange({ ...base, disabled: true });
    expect(view.thumbs.every((t) => t.input['disabled'] === true)).toBe(true);
    expect(view.root['aria-disabled']).toBe('true');
    [view.root, view.track, view.fills[0].bag, view.thumbs[0].slot, view.thumbs[0].input, view.thumbs[0].tooltip].forEach((bag) =>
      expect(bag['data-mps']).toBeUndefined(),
    );
  });
});
