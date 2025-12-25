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
  ): SchedulerEvent => ({
    id,
    title: `Event ${id}`,
    start: new Date(2025, 0, day, startHour, 0),
    end: new Date(2025, 0, day, endHour, 0),
    color: '#3788d8',
  });

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
