import { describe, expect, it } from 'vitest';
import type { DragOperationType, TimeSlot } from '@mintplayer/web-components/scheduler-core';
import { DragPreviewCalculator } from './drag-preview';
import { DEFAULT_DRAG_CONFIG } from './drag-types';

const slot: TimeSlot = { start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) };

describe('DragPreviewCalculator', () => {
  const calc = new DragPreviewCalculator(DEFAULT_DRAG_CONFIG);

  it.each<DragOperationType>(['move', 'resize-start', 'resize-end'])(
    'a %s has no preview without the event being dragged',
    (type) => {
      expect(calc.calculatePreview(type, slot, slot, null)).toBeNull();
    },
  );

  it('an unknown operation has no preview', () => {
    expect(calc.calculatePreview('teleport' as DragOperationType, slot, slot, null)).toBeNull();
  });

  it('a create needs no event', () => {
    expect(calc.calculatePreview('create', slot, slot, null)).toEqual({ start: slot.start, end: slot.end });
  });
});
