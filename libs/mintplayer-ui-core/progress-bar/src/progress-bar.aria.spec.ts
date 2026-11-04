import { describe, expect, it } from 'vitest';
import { connectProgress, connectProgressBar, progressPercentage, type ProgressBarInputs } from './progress-bar.core';

const bar = (patch: Partial<ProgressBarInputs> = {}): ProgressBarInputs => ({
  minimum: 0,
  maximum: 100,
  value: 40,
  color: 'primary',
  striped: false,
  animated: false,
  label: 'Progress',
  valueText: null,
  ...patch,
});

describe('progress', () => {
  it('is a named progressbar with its value range on the role', () => {
    const view = connectProgressBar(bar({ minimum: 0, maximum: 5, value: 3, valueText: '3 of 5 steps', label: 'Upload' }));
    expect(view.bar).toMatchObject({
      role: 'progressbar',
      'aria-valuenow': '3',
      'aria-valuemin': '0',
      'aria-valuemax': '5',
      'aria-label': 'Upload',
      'aria-valuetext': '3 of 5 steps',
    });
    expect(view.bar['data-progress']).toBe('60');
  });

  it("takes the consumer's aria-label over its own", () => {
    expect(connectProgressBar(bar(), 'Disk usage').bar['aria-label']).toBe('Disk usage');
  });

  it('clamps the width and survives an empty range', () => {
    expect(progressPercentage(150, 0, 100)).toBe(100);
    expect(progressPercentage(-5, 0, 100)).toBe(0);
    expect(progressPercentage(5, 10, 10)).toBe(0);
  });

  it('paints the colour with a contrasting text colour; animated implies striped', () => {
    expect(connectProgressBar(bar({ color: 'warning', animated: true })).bar['class']).toBe(
      'progress-bar text-bg-warning progress-bar-striped progress-bar-animated',
    );
  });

  it('an indeterminate track is one named progressbar with no value', () => {
    const view = connectProgress({ height: 4, indeterminate: true, label: 'Laden' });
    expect(view.indeterminate).toMatchObject({ role: 'progressbar', 'aria-label': 'Laden' });
    expect(view.indeterminate!['aria-valuenow']).toBeUndefined();
    expect(view.trackStyle).toEqual({ '--bs-progress-height': '4px' });
    expect(connectProgress({ height: null, indeterminate: false, label: 'x' }).indeterminate).toBeNull();
  });
});
