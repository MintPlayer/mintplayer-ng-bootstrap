import { describe, expect, it } from 'vitest';

import { PositionService, positionService } from './position.service';
import type { SchedulerEventPart } from '../models/event';

/**
 * Where an event box lands in a scheduler grid.
 *
 * Everything here works in **percentages of the container**, which is what
 * makes the whole layout resolution-independent — and also what makes it
 * testable at all, because none of it needs a measured DOM. The consequence
 * worth stating: an event that runs outside the visible window still gets a
 * position, just one outside 0–100. Clamping is the caller's decision, and
 * silently clamping here would hide an event the user asked to see.
 */

const at = (startHour: number, endHour: number): SchedulerEventPart =>
  ({
    start: new Date(2026, 0, 1, startHour, 0, 0),
    end: new Date(2026, 0, 1, endHour, 0, 0),
  }) as SchedulerEventPart;

const service = new PositionService();

describe('calculateWeekPosition — the vertical axis is the clock', () => {
  // Defaults span 00:00–24:00, so an hour is 1/24 of the height.
  it('places an event by its start time', () => {
    expect(service.calculateWeekPosition(at(6, 7), 0, 1, 0, 1).top).toBeCloseTo(25, 6);
  });

  it('sizes an event by its duration', () => {
    expect(service.calculateWeekPosition(at(6, 12), 0, 1, 0, 1).height).toBeCloseTo(25, 6);
  });

  it('puts a midnight start at the top', () => {
    expect(service.calculateWeekPosition(at(0, 1), 0, 1, 0, 1).top).toBe(0);
  });

  it('scales to a restricted day window', () => {
    const position = service.calculateWeekPosition(at(12, 13), 0, 1, 0, 1, {
      slotMinTime: '08:00',
      slotMaxTime: '20:00',
    });
    expect(position.top).toBeCloseTo((4 / 12) * 100, 6);
    expect(position.height).toBeCloseTo((1 / 12) * 100, 6);
  });

  /*
   * An event before the window opens gets a negative top rather than being
   * pinned to zero. That is deliberate: the caller decides whether to clip,
   * scroll to it, or show an indicator, and a silently clamped box would sit
   * at 08:00 pretending to be an 06:00 meeting.
   */
  it('reports a position outside the window rather than clamping it', () => {
    const position = service.calculateWeekPosition(at(6, 7), 0, 1, 0, 1, {
      slotMinTime: '08:00',
      slotMaxTime: '20:00',
    });
    expect(position.top).toBeLessThan(0);
  });

  it('gives a zero-length event no height', () => {
    expect(service.calculateWeekPosition(at(9, 9), 0, 1, 0, 1).height).toBe(0);
  });
});

describe('calculateWeekPosition — the horizontal axis is the day grid', () => {
  // A tenth of the width is the time gutter; the days share what is left.
  it('starts the first day after the gutter', () => {
    expect(service.calculateWeekPosition(at(9, 10), 0, 1, 0, 7).left).toBeCloseTo(10, 6);
  });

  it('gives each day an equal share of the remainder', () => {
    expect(service.calculateWeekPosition(at(9, 10), 0, 1, 0, 7).width).toBeCloseTo(90 / 7, 6);
  });

  it('offsets a later day by whole day widths', () => {
    const position = service.calculateWeekPosition(at(9, 10), 0, 1, 3, 7);
    expect(position.left).toBeCloseTo(10 + (90 / 7) * 3, 6);
  });

  // Overlapping events split their day column between them — the standard
  // calendar treatment, and the reason a track index exists at all.
  it('splits the column between concurrent events', () => {
    const first = service.calculateWeekPosition(at(9, 10), 0, 2, 0, 7);
    const second = service.calculateWeekPosition(at(9, 10), 1, 2, 0, 7);

    expect(first.width).toBeCloseTo(90 / 7 / 2, 6);
    expect(second.left - first.left).toBeCloseTo(first.width, 6);
  });

  it('leaves no gap between adjacent tracks', () => {
    const positions = [0, 1, 2].map((track) =>
      service.calculateWeekPosition(at(9, 10), track, 3, 0, 7),
    );
    const spanned = positions[2].left + positions[2].width - positions[0].left;
    expect(spanned).toBeCloseTo(90 / 7, 6);
  });

  // Later tracks stack above earlier ones so an overlap reads as a pile rather
  // than as one box swallowing another.
  it('stacks later tracks in front', () => {
    expect(service.calculateWeekPosition(at(9, 10), 0, 2, 0, 7).zIndex).toBe(1);
    expect(service.calculateWeekPosition(at(9, 10), 1, 2, 0, 7).zIndex).toBe(2);
  });

  it('gives a single day the whole non-gutter width', () => {
    expect(service.calculateWeekPosition(at(9, 10), 0, 1, 0, 1).width).toBeCloseTo(90, 6);
  });
});

describe('calculateTimelinePosition', () => {
  const viewStart = new Date(2026, 0, 1, 0, 0, 0);
  const viewEnd = new Date(2026, 0, 2, 0, 0, 0);

  it('places an event by its offset into the window', () => {
    const position = service.calculateTimelinePosition(at(6, 12), 0, 1, viewStart, viewEnd);
    expect(position.left).toBeCloseTo(25, 6);
    expect(position.width).toBeCloseTo(25, 6);
  });

  // The visible window is the frame, so an event running past either edge is
  // shown clipped to it rather than overflowing the timeline.
  it('clips an event that starts before the window', () => {
    const position = service.calculateTimelinePosition(
      { start: new Date(2025, 11, 31, 12, 0), end: new Date(2026, 0, 1, 6, 0) } as SchedulerEventPart,
      0,
      1,
      viewStart,
      viewEnd,
    );
    expect(position.left).toBe(0);
    expect(position.width).toBeCloseTo(25, 6);
  });

  it('clips an event that runs past the window', () => {
    const position = service.calculateTimelinePosition(
      { start: new Date(2026, 0, 1, 18, 0), end: new Date(2026, 0, 3, 0, 0) } as SchedulerEventPart,
      0,
      1,
      viewStart,
      viewEnd,
    );
    expect(position.left).toBeCloseTo(75, 6);
    expect(position.left + position.width).toBeCloseTo(100, 6);
  });

  it('fills the window for an event that spans it entirely', () => {
    const position = service.calculateTimelinePosition(
      { start: new Date(2025, 11, 1), end: new Date(2026, 5, 1) } as SchedulerEventPart,
      0,
      1,
      viewStart,
      viewEnd,
    );
    expect(position.left).toBe(0);
    expect(position.width).toBeCloseTo(100, 6);
  });

  it('gives each resource row an equal band', () => {
    expect(service.calculateTimelinePosition(at(6, 12), 0, 4, viewStart, viewEnd).height).toBeCloseTo(
      25,
      6,
    );
  });

  it('stacks the rows in order', () => {
    const tops = [0, 1, 2].map(
      (track) => service.calculateTimelinePosition(at(6, 12), track, 3, viewStart, viewEnd).top,
    );
    expect(tops).toEqual([0, 100 / 3, (100 / 3) * 2]);
  });

  it('gives every timeline event the same depth', () => {
    expect(service.calculateTimelinePosition(at(6, 12), 2, 4, viewStart, viewEnd).zIndex).toBe(1);
  });
});

describe('calculateMonthEventPosition', () => {
  it('places an event on its day of the week', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 0, 4, 2, 2).left).toBeCloseTo(
      (100 / 7) * 2,
      6,
    );
  });

  // A multi-day banner spans its days INCLUSIVELY — a Tuesday-to-Thursday
  // event covers three columns, not two.
  it('spans a multi-day event inclusively', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 0, 4, 2, 4).width).toBeCloseTo(
      (100 / 7) * 3,
      6,
    );
  });

  it('gives a single-day event one column', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 0, 4, 3, 3).width).toBeCloseTo(100 / 7, 6);
  });

  it('stacks the rows within a day cell', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 2, 4, 0, 0).top).toBeCloseTo(50, 6);
    expect(service.calculateMonthEventPosition(at(0, 24), 2, 4, 0, 0).height).toBeCloseTo(25, 6);
  });

  it('lets a caller use a different week width', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 0, 1, 0, 0, 5).width).toBeCloseTo(20, 6);
  });

  it('layers later rows in front', () => {
    expect(service.calculateMonthEventPosition(at(0, 24), 3, 4, 0, 0).zIndex).toBe(4);
  });
});

describe('converting a position for rendering', () => {
  const position = { top: 25, left: 10, width: 20, height: 50, zIndex: 3 };

  it('resolves percentages against a measured container', () => {
    expect(service.toPixelPosition(position, 1000, 800)).toEqual({
      top: 200,
      left: 100,
      width: 200,
      height: 400,
      zIndex: 3,
    });
  });

  it('leaves the stacking order alone', () => {
    expect(service.toPixelPosition(position, 1000, 800).zIndex).toBe(position.zIndex);
  });

  it('collapses to nothing in an unmeasured container', () => {
    expect(service.toPixelPosition(position, 0, 0)).toMatchObject({ top: 0, width: 0 });
  });

  it('writes a style string in percent by default', () => {
    const style = service.toStyleString(position);
    expect(style).toContain('position: absolute;');
    expect(style).toContain('top: 25%;');
    expect(style).toContain('z-index: 3;');
  });

  it('writes a style string in pixels when asked', () => {
    expect(service.toStyleString(position, 'px')).toContain('left: 10px;');
  });

  // The style string goes into an inline `style` attribute, so its whitespace
  // has to be collapsed — a template literal with real newlines in it would
  // otherwise be embedded verbatim.
  it('collapses the style string to one line', () => {
    expect(service.toStyleString(position)).not.toContain('\n');
  });

  it('writes a style object for a framework binding', () => {
    expect(service.toStyleObject(position)).toEqual({
      position: 'absolute',
      top: '25%',
      left: '10%',
      width: '20%',
      height: '50%',
      zIndex: '3',
    });
  });

  it('writes the style object in pixels when asked', () => {
    expect(service.toStyleObject(position, 'px').height).toBe('50px');
  });

  it('agrees between the string and object forms', () => {
    const object = service.toStyleObject(position);
    const string = service.toStyleString(position);
    expect(string).toContain(`top: ${object.top};`);
    expect(string).toContain(`height: ${object.height};`);
  });
});

describe('the shared instance', () => {
  it('is a PositionService', () => {
    expect(positionService).toBeInstanceOf(PositionService);
  });

  it('agrees with a fresh one', () => {
    expect(positionService.calculateWeekPosition(at(9, 10), 0, 1, 0, 7)).toEqual(
      service.calculateWeekPosition(at(9, 10), 0, 1, 0, 7),
    );
  });
});
