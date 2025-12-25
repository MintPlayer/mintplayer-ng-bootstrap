import {
  SchedulerEvent,
  SchedulerEventPart,
  SchedulerEventWithParts,
  PreviewEvent,
  TimelineTrack,
} from '../models/event';
import { dateService } from './date.service';

/**
 * Service for timeline calculations and event track assignment
 */
export class TimelineService {
  /**
   * Split an event into daily parts
   * Each part represents one day of a multi-day event
   */
  splitInParts(event: SchedulerEvent | PreviewEvent): SchedulerEventWithParts {
    const parts: SchedulerEventPart[] = [];
    let currentStart = new Date(event.start);
    let dayIndex = 0;

    // Calculate total days
    const totalDays = this.getTotalDays(event.start, event.end);

    // For events within the same day
    if (dateService.isSameDay(event.start, event.end)) {
      const isFullEvent = 'id' in event;
      parts.push({
        id: isFullEvent ? `${event.id}-0` : `preview-0`,
        event: isFullEvent ? event : (null as unknown as SchedulerEvent),
        start: event.start,
        end: event.end,
        isStart: true,
        isEnd: true,
        dayIndex: 0,
        totalDays: 1,
      });

      return {
        event: isFullEvent ? event : (null as unknown as SchedulerEvent),
        parts,
      };
    }

    // For multi-day events
    while (!dateService.isSameDay(currentStart, event.end)) {
      const dayEnd = new Date(currentStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(0, 0, 0, 0);

      const isFullEvent = 'id' in event;
      parts.push({
        id: isFullEvent ? `${event.id}-${dayIndex}` : `preview-${dayIndex}`,
        event: isFullEvent ? event : (null as unknown as SchedulerEvent),
        start: new Date(currentStart),
        end: dayEnd,
        isStart: dayIndex === 0,
        isEnd: false,
        dayIndex,
        totalDays,
      });

      currentStart = dayEnd;
      dayIndex++;
    }

    // Add final part if the end time is not midnight
    if (event.end.getHours() !== 0 || event.end.getMinutes() !== 0 || event.end.getSeconds() !== 0) {
      const isFullEvent = 'id' in event;
      parts.push({
        id: isFullEvent ? `${event.id}-${dayIndex}` : `preview-${dayIndex}`,
        event: isFullEvent ? event : (null as unknown as SchedulerEvent),
        start: new Date(currentStart),
        end: event.end,
        isStart: false,
        isEnd: true,
        dayIndex,
        totalDays,
      });
    }

    return {
      event: 'id' in event ? event : (null as unknown as SchedulerEvent),
      parts,
    };
  }

  /**
   * Calculate total days an event spans
   */
  private getTotalDays(start: Date, end: Date): number {
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const diffMs = endDay.getTime() - startDay.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // If end time is not midnight, add 1
    if (end.getHours() !== 0 || end.getMinutes() !== 0 || end.getSeconds() !== 0) {
      return days + 1;
    }

    return Math.max(1, days);
  }

  /**
   * Assign events to tracks (rails) to minimize overlapping
   * This method should be called when events are updated, NOT during drag operations
   */
  getTimeline(events: SchedulerEvent[]): TimelineTrack[] {
    if (events.length === 0) {
      return [];
    }

    // Get all unique timestamps and sort them
    const timestamps = this.getUniqueTimestamps(events);
    const tracks: TimelineTrack[] = [];

    // Process events starting at each timestamp
    for (const timestamp of timestamps) {
      const startingEvents = events.filter((e) => e.start.getTime() === timestamp.getTime());

      for (const event of startingEvents) {
        // Find a free track for this event
        const freeTrack = tracks.find((track) => this.isTrackFreeForEvent(track, event));

        if (freeTrack) {
          freeTrack.events.push(event);
        } else {
          // Create a new track
          tracks.push({
            index: tracks.length,
            events: [event],
          });
        }
      }
    }

    return tracks;
  }

  /**
   * Get track assignment for event parts (for rendering)
   */
  getTimelinedParts(
    eventParts: SchedulerEventPart[]
  ): { part: SchedulerEventPart; trackIndex: number; totalTracks: number }[] {
    // Group parts by their parent event
    const eventIds = new Set(eventParts.filter(p => p.event).map((p) => p.event.id));
    const events = Array.from(eventIds).map((id) => {
      const part = eventParts.find((p) => p.event?.id === id);
      return part?.event;
    }).filter((e): e is SchedulerEvent => e !== undefined);

    // Get timeline tracks for the events
    const tracks = this.getTimeline(events);

    // Map parts to their track indices
    return eventParts.map((part) => {
      if (!part.event) {
        return { part, trackIndex: 0, totalTracks: 1 };
      }

      const track = tracks.find((t) => t.events.some((e) => e.id === part.event.id));
      return {
        part,
        trackIndex: track?.index ?? 0,
        totalTracks: tracks.length,
      };
    });
  }

  /**
   * Filter events that fall within a date range
   */
  filterByRange(events: SchedulerEvent[], start: Date, end: Date): SchedulerEvent[] {
    return events.filter((event) => {
      // Event overlaps with range if:
      // event.start < rangeEnd AND event.end > rangeStart
      return event.start < end && event.end > start;
    });
  }

  /**
   * Filter event parts that fall within a date range
   */
  filterPartsByRange(parts: SchedulerEventPart[], start: Date, end: Date): SchedulerEventPart[] {
    return parts.filter((part) => {
      return part.start < end && part.end > start;
    });
  }

  /**
   * Get all unique timestamps from events (both start and end times)
   */
  private getUniqueTimestamps(events: SchedulerEvent[]): Date[] {
    const timestampSet = new Set<number>();

    for (const event of events) {
      timestampSet.add(event.start.getTime());
      timestampSet.add(event.end.getTime());
    }

    return Array.from(timestampSet)
      .sort((a, b) => a - b)
      .map((ts) => new Date(ts));
  }

  /**
   * Check if a track has space for an event (no overlapping)
   */
  private isTrackFreeForEvent(track: TimelineTrack, event: SchedulerEvent): boolean {
    return track.events.every((existingEvent) => {
      // No overlap if: existingEvent ends before event starts OR event ends before existingEvent starts
      return existingEvent.end <= event.start || event.end <= existingEvent.start;
    });
  }

  /**
   * Get events for a specific day
   */
  getEventsForDay(events: SchedulerEvent[], day: Date): SchedulerEvent[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return this.filterByRange(events, dayStart, dayEnd);
  }

  /**
   * Get event parts for a specific day
   */
  getPartsForDay(parts: SchedulerEventPart[], day: Date): SchedulerEventPart[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return this.filterPartsByRange(parts, dayStart, dayEnd);
  }
}

/**
 * Singleton instance of TimelineService
 */
export const timelineService = new TimelineService();
