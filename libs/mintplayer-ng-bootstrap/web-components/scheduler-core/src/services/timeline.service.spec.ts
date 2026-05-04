import { describe, it, expect, beforeEach } from 'vitest';
import { TimelineService, timelineService } from './timeline.service';
import { SchedulerEvent } from '../models/event';

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(() => {
    service = new TimelineService();
  });

  const createEvent = (
    id: string,
    startHour: number,
    endHour: number,
    day: number = 15
  ): SchedulerEvent => {
    // Handle fractional hours (e.g., 10.5 = 10:30)
    const startH = Math.floor(startHour);
    const startM = Math.round((startHour - startH) * 60);
    const endH = Math.floor(endHour);
    const endM = Math.round((endHour - endH) * 60);

    return {
      id,
      title: `Event ${id}`,
      start: new Date(2025, 0, day, startH, startM),
      end: new Date(2025, 0, day, endH, endM),
      color: '#3788d8',
    };
  };

  const createMultiDayEvent = (
    id: string,
    startDay: number,
    endDay: number
  ): SchedulerEvent => ({
    id,
    title: `Event ${id}`,
    start: new Date(2025, 0, startDay, 9, 0),
    end: new Date(2025, 0, endDay, 17, 0),
    color: '#3788d8',
  });

  describe('splitInParts', () => {
    it('should return 1 part for single-day event', () => {
      const event = createEvent('1', 9, 17);
      const result = service.splitInParts(event);

      expect(result.parts.length).toBe(1);
      expect(result.parts[0].isStart).toBe(true);
      expect(result.parts[0].isEnd).toBe(true);
      expect(result.parts[0].dayIndex).toBe(0);
      expect(result.parts[0].totalDays).toBe(1);
    });

    it('should return correct number of parts for multi-day event', () => {
      const event = createMultiDayEvent('1', 15, 17); // 3 days
      const result = service.splitInParts(event);

      expect(result.parts.length).toBe(3);
    });

    it('should set correct isStart/isEnd flags for multi-day event', () => {
      const event = createMultiDayEvent('1', 15, 17);
      const result = service.splitInParts(event);

      expect(result.parts[0].isStart).toBe(true);
      expect(result.parts[0].isEnd).toBe(false);

      expect(result.parts[1].isStart).toBe(false);
      expect(result.parts[1].isEnd).toBe(false);

      expect(result.parts[2].isStart).toBe(false);
      expect(result.parts[2].isEnd).toBe(true);
    });

    it('should set correct dayIndex for each part', () => {
      const event = createMultiDayEvent('1', 15, 17);
      const result = service.splitInParts(event);

      expect(result.parts[0].dayIndex).toBe(0);
      expect(result.parts[1].dayIndex).toBe(1);
      expect(result.parts[2].dayIndex).toBe(2);
    });

    it('should handle preview events (without id)', () => {
      const preview = {
        start: new Date(2025, 0, 15, 9, 0),
        end: new Date(2025, 0, 15, 17, 0),
      };
      const result = service.splitInParts(preview as SchedulerEvent);

      expect(result.parts.length).toBe(1);
      expect(result.parts[0].event).toBeNull();
    });
  });

  describe('getTimeline', () => {
    it('should return empty tracks for empty array', () => {
      const tracks = service.getTimeline([]);
      expect(tracks.length).toBe(0);
    });

    it('should place non-overlapping events in same track', () => {
      const events = [
        createEvent('1', 9, 10),
        createEvent('2', 11, 12),
        createEvent('3', 14, 15),
      ];

      const tracks = service.getTimeline(events);

      expect(tracks.length).toBe(1);
      expect(tracks[0].events.length).toBe(3);
    });

    it('should place overlapping events in different tracks', () => {
      const events = [
        createEvent('1', 9, 12),
        createEvent('2', 10, 13),
      ];

      const tracks = service.getTimeline(events);

      expect(tracks.length).toBe(2);
      expect(tracks[0].events.length).toBe(1);
      expect(tracks[1].events.length).toBe(1);
    });

    it('should minimize number of tracks', () => {
      const events = [
        createEvent('1', 9, 10),   // Track 0
        createEvent('2', 9, 10),   // Track 1 (overlaps with 1)
        createEvent('3', 10, 11),  // Track 0 (after 1 ends)
        createEvent('4', 10, 11),  // Track 1 (after 2 ends)
      ];

      const tracks = service.getTimeline(events);

      expect(tracks.length).toBe(2);
    });

    it('should handle back-to-back events without overlap', () => {
      const events = [
        createEvent('1', 9, 10),
        createEvent('2', 10, 11), // Starts exactly when 1 ends
      ];

      const tracks = service.getTimeline(events);

      expect(tracks.length).toBe(1);
    });

    it('should assign correct track indices', () => {
      const events = [
        createEvent('1', 9, 12),
        createEvent('2', 10, 13),
        createEvent('3', 11, 14),
      ];

      const tracks = service.getTimeline(events);

      expect(tracks[0].index).toBe(0);
      expect(tracks[1].index).toBe(1);
      expect(tracks[2].index).toBe(2);
    });
  });

  describe('getTimelinedParts', () => {
    it('should assign track indices to parts', () => {
      const event1 = createEvent('1', 9, 12);
      const event2 = createEvent('2', 10, 13);

      const parts1 = service.splitInParts(event1).parts;
      const parts2 = service.splitInParts(event2).parts;

      const result = service.getTimelinedParts([...parts1, ...parts2]);

      const event1Part = result.find((r) => r.part.event?.id === '1');
      const event2Part = result.find((r) => r.part.event?.id === '2');

      expect(event1Part?.trackIndex).toBe(0);
      expect(event2Part?.trackIndex).toBe(1);
      expect(event1Part?.totalTracks).toBe(2);
      expect(event2Part?.totalTracks).toBe(2);
    });

    it('should give non-overlapping event full width (totalTracks: 1)', () => {
      // Event A: 9:00-9:30 (no overlaps)
      // Event B: 10:00-11:00 (overlaps with C)
      // Event C: 10:30-11:30 (overlaps with B)
      const eventA = createEvent('A', 9, 9.5);  // 9:00-9:30
      const eventB = createEvent('B', 10, 11);  // 10:00-11:00
      const eventC = createEvent('C', 10.5, 11.5);  // 10:30-11:30

      const partsA = service.splitInParts(eventA).parts;
      const partsB = service.splitInParts(eventB).parts;
      const partsC = service.splitInParts(eventC).parts;

      const result = service.getTimelinedParts([...partsA, ...partsB, ...partsC]);

      const eventAPart = result.find((r) => r.part.event?.id === 'A');
      const eventBPart = result.find((r) => r.part.event?.id === 'B');
      const eventCPart = result.find((r) => r.part.event?.id === 'C');

      // Event A has no overlaps, should get full width
      expect(eventAPart?.totalTracks).toBe(1);
      expect(eventAPart?.trackIndex).toBe(0);

      // Events B and C overlap with each other, should get 50% each
      expect(eventBPart?.totalTracks).toBe(2);
      expect(eventCPart?.totalTracks).toBe(2);
    });

    it('should handle three overlapping events (33% width each)', () => {
      const event1 = createEvent('1', 9, 12);
      const event2 = createEvent('2', 10, 13);
      const event3 = createEvent('3', 11, 14);

      const parts1 = service.splitInParts(event1).parts;
      const parts2 = service.splitInParts(event2).parts;
      const parts3 = service.splitInParts(event3).parts;

      const result = service.getTimelinedParts([...parts1, ...parts2, ...parts3]);

      const event1Part = result.find((r) => r.part.event?.id === '1');
      const event2Part = result.find((r) => r.part.event?.id === '2');
      const event3Part = result.find((r) => r.part.event?.id === '3');

      // All three events overlap (at least partially), so each gets 1/3 width
      expect(event1Part?.totalTracks).toBe(3);
      expect(event2Part?.totalTracks).toBe(3);
      expect(event3Part?.totalTracks).toBe(3);

      // Track indices should be relative (0, 1, 2)
      expect(event1Part?.trackIndex).toBe(0);
      expect(event2Part?.trackIndex).toBe(1);
      expect(event3Part?.trackIndex).toBe(2);
    });

    it('should use relative track indices for non-consecutive overlaps', () => {
      // Event A: 9:00-10:00 (track 0, overlaps with B)
      // Event B: 9:00-10:30 (track 1, overlaps with A and C)
      // Event C: 10:00-11:00 (track 0, doesn't overlap with A since A ends exactly when C starts)
      //
      // Track assignment:
      // - Track 0: A (9:00-10:00), C (10:00-11:00) - back-to-back, no overlap
      // - Track 1: B (9:00-10:30)
      const eventA = createEvent('A', 9, 10);
      const eventB = createEvent('B', 9, 10.5);  // 9:00-10:30
      const eventC = createEvent('C', 10, 11);

      const partsA = service.splitInParts(eventA).parts;
      const partsB = service.splitInParts(eventB).parts;
      const partsC = service.splitInParts(eventC).parts;

      const result = service.getTimelinedParts([...partsA, ...partsB, ...partsC]);

      const eventAPart = result.find((r) => r.part.event?.id === 'A');
      const eventBPart = result.find((r) => r.part.event?.id === 'B');
      const eventCPart = result.find((r) => r.part.event?.id === 'C');

      // Event A (9:00-10:00) overlaps with B (9:00-10:30), both on tracks 0 and 1
      expect(eventAPart?.totalTracks).toBe(2);
      expect(eventAPart?.trackIndex).toBe(0);

      // Event B (9:00-10:30) overlaps with A (9:00-10:00) and C (10:00-10:30)
      // Both A and C are on track 0, B is on track 1 → 2 tracks total
      expect(eventBPart?.totalTracks).toBe(2);
      expect(eventBPart?.trackIndex).toBe(1);

      // Event C (10:00-11:00) overlaps with B (10:00-10:30) but not with A
      // C is on track 0, B is on track 1 → 2 tracks overlap
      expect(eventCPart?.totalTracks).toBe(2);
      expect(eventCPart?.trackIndex).toBe(0);
    });

    it('should handle three truly concurrent events correctly', () => {
      // All three events overlap at 10:00-10:30, requiring 3 separate tracks
      // Event A: 9:00-11:00 (starts first, gets track 0)
      // Event C: 10:00-10:30 (starts same as B but ends earlier, gets track 1)
      // Event B: 10:00-12:00 (starts same as C but ends later, gets track 2)
      // Note: Algorithm sorts by start time, then end time, then id
      const eventA = createEvent('A', 9, 11);
      const eventB = createEvent('B', 10, 12);
      const eventC = createEvent('C', 10, 10.5);

      const partsA = service.splitInParts(eventA).parts;
      const partsB = service.splitInParts(eventB).parts;
      const partsC = service.splitInParts(eventC).parts;

      const result = service.getTimelinedParts([...partsA, ...partsB, ...partsC]);

      const eventAPart = result.find((r) => r.part.event?.id === 'A');
      const eventBPart = result.find((r) => r.part.event?.id === 'B');
      const eventCPart = result.find((r) => r.part.event?.id === 'C');

      // All events overlap during 10:00-10:30, so all get 3 tracks
      expect(eventAPart?.totalTracks).toBe(3);
      expect(eventBPart?.totalTracks).toBe(3);
      expect(eventCPart?.totalTracks).toBe(3);

      // Track indices based on sort order: A (starts first), C (shorter), B (longer)
      expect(eventAPart?.trackIndex).toBe(0);
      expect(eventCPart?.trackIndex).toBe(1);
      expect(eventBPart?.trackIndex).toBe(2);
    });

    it('should handle mixed overlap scenarios correctly', () => {
      // Event 1: 9:00-10:00 (alone)
      // Event 2: 11:00-12:00 (overlaps with 3)
      // Event 3: 11:30-12:30 (overlaps with 2)
      // Event 4: 14:00-15:00 (alone)
      const event1 = createEvent('1', 9, 10);
      const event2 = createEvent('2', 11, 12);
      const event3 = createEvent('3', 11.5, 12.5);
      const event4 = createEvent('4', 14, 15);

      const parts1 = service.splitInParts(event1).parts;
      const parts2 = service.splitInParts(event2).parts;
      const parts3 = service.splitInParts(event3).parts;
      const parts4 = service.splitInParts(event4).parts;

      const result = service.getTimelinedParts([...parts1, ...parts2, ...parts3, ...parts4]);

      const event1Part = result.find((r) => r.part.event?.id === '1');
      const event2Part = result.find((r) => r.part.event?.id === '2');
      const event3Part = result.find((r) => r.part.event?.id === '3');
      const event4Part = result.find((r) => r.part.event?.id === '4');

      // Events 1 and 4 have no overlaps → full width
      expect(event1Part?.totalTracks).toBe(1);
      expect(event4Part?.totalTracks).toBe(1);

      // Events 2 and 3 overlap with each other → 50% width
      expect(event2Part?.totalTracks).toBe(2);
      expect(event3Part?.totalTracks).toBe(2);
    });
  });

  describe('filterByRange', () => {
    it('should include events that start within range', () => {
      const events = [
        createEvent('1', 10, 12),
      ];
      const rangeStart = new Date(2025, 0, 15, 9, 0);
      const rangeEnd = new Date(2025, 0, 15, 18, 0);

      const filtered = service.filterByRange(events, rangeStart, rangeEnd);

      expect(filtered.length).toBe(1);
    });

    it('should include events that end within range', () => {
      const events = [
        createEvent('1', 8, 10),
      ];
      const rangeStart = new Date(2025, 0, 15, 9, 0);
      const rangeEnd = new Date(2025, 0, 15, 18, 0);

      const filtered = service.filterByRange(events, rangeStart, rangeEnd);

      expect(filtered.length).toBe(1);
    });

    it('should include events that span entire range', () => {
      const events = [
        createEvent('1', 8, 20),
      ];
      const rangeStart = new Date(2025, 0, 15, 9, 0);
      const rangeEnd = new Date(2025, 0, 15, 18, 0);

      const filtered = service.filterByRange(events, rangeStart, rangeEnd);

      expect(filtered.length).toBe(1);
    });

    it('should exclude events completely outside range', () => {
      const events = [
        createEvent('1', 6, 8),  // Before range
        createEvent('2', 19, 21), // After range
      ];
      const rangeStart = new Date(2025, 0, 15, 9, 0);
      const rangeEnd = new Date(2025, 0, 15, 18, 0);

      const filtered = service.filterByRange(events, rangeStart, rangeEnd);

      expect(filtered.length).toBe(0);
    });

    it('should handle events on range boundaries', () => {
      const events = [
        createEvent('1', 9, 10), // Starts at range start
        createEvent('2', 17, 18), // Ends at range end
      ];
      const rangeStart = new Date(2025, 0, 15, 9, 0);
      const rangeEnd = new Date(2025, 0, 15, 18, 0);

      const filtered = service.filterByRange(events, rangeStart, rangeEnd);

      expect(filtered.length).toBe(2);
    });
  });

  describe('getEventsForDay', () => {
    it('should return events for specific day', () => {
      const events = [
        createEvent('1', 9, 12, 15),
        createEvent('2', 10, 13, 15),
        createEvent('3', 9, 12, 16), // Different day
      ];

      const day = new Date(2025, 0, 15);
      const filtered = service.getEventsForDay(events, day);

      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.id)).toContain('1');
      expect(filtered.map((e) => e.id)).toContain('2');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(timelineService).toBeInstanceOf(TimelineService);
    });
  });
});
