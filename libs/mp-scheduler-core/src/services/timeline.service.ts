import {
  SchedulerEvent,
  SchedulerEventPart,
  SchedulerEventWithParts,
  PreviewEvent,
  TimelineTrack,
  EventLayoutInfo,
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
   * Get track assignment for event parts using colspan algorithm (for rendering)
   *
   * This uses a colspan-based algorithm similar to Outlook/Google Calendar:
   * 1. Build overlap groups (connected components of overlapping events)
   * 2. Assign columns within each group using a greedy algorithm
   * 3. Compute colspan - how many columns each event can span
   *
   * This ensures events are displayed as wide as possible:
   * - An event with no overlapping events gets 100% width
   * - Events only share space with events they actually overlap with
   * - An event can span multiple columns if there's no blocking event to its right
   */
  getTimelinedParts(
    eventParts: SchedulerEventPart[]
  ): { part: SchedulerEventPart; trackIndex: number; totalTracks: number; colspan: number }[] {
    // Group parts by their parent event
    const eventIds = new Set(eventParts.filter(p => p.event).map((p) => p.event.id));
    const events = Array.from(eventIds).map((id) => {
      const part = eventParts.find((p) => p.event?.id === id);
      return part?.event;
    }).filter((e): e is SchedulerEvent => e !== undefined);

    // Get layout info using colspan algorithm
    const layoutMap = this.getColspanLayout(events);

    // Map parts to their layout info
    return eventParts.map((part) => {
      if (!part.event) {
        return { part, trackIndex: 0, totalTracks: 1, colspan: 1 };
      }

      const layout = layoutMap.get(part.event.id);
      if (!layout) {
        return { part, trackIndex: 0, totalTracks: 1, colspan: 1 };
      }

      return {
        part,
        trackIndex: layout.col,
        totalTracks: layout.columnCount,
        colspan: layout.colspan,
      };
    });
  }

  /**
   * Compute colspan-based layout for events (Outlook/Google Calendar algorithm)
   *
   * Phase 1: Build overlap groups (connected components)
   * Phase 2: Assign columns within each group
   * Phase 3: Compute colspan for each event
   */
  getColspanLayout(events: SchedulerEvent[]): Map<string, EventLayoutInfo> {
    const layoutMap = new Map<string, EventLayoutInfo>();

    if (events.length === 0) {
      return layoutMap;
    }

    // Phase 1: Build overlap groups
    const groups = this.buildOverlapGroups(events);

    for (const group of groups) {
      // Phase 2: Assign columns
      this.assignColumns(group, layoutMap);

      // Get column count for this group
      const columnCount = Math.max(...group.map(e => layoutMap.get(e.id)?.col ?? 0)) + 1;

      // Phase 3: Compute colspan for each event
      for (const event of group) {
        const col = layoutMap.get(event.id)?.col ?? 0;
        const colspan = this.computeColspan(event, col, group, layoutMap, columnCount);

        layoutMap.set(event.id, {
          col,
          colspan,
          columnCount,
        });
      }
    }

    return layoutMap;
  }

  /**
   * Build overlap groups (connected components)
   * Events belong to the same group if they overlap directly or indirectly
   */
  private buildOverlapGroups(events: SchedulerEvent[]): SchedulerEvent[][] {
    const groups: SchedulerEvent[][] = [];
    const visited = new Set<string>();

    for (const event of events) {
      if (visited.has(event.id)) continue;

      // BFS to find all connected events
      const group: SchedulerEvent[] = [];
      const queue: SchedulerEvent[] = [event];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        group.push(current);

        // Find all events that overlap with current
        for (const other of events) {
          if (!visited.has(other.id) && this.eventsOverlap(current, other)) {
            queue.push(other);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Assign columns to events within an overlap group
   * Uses a greedy algorithm: place each event in the first available column
   */
  private assignColumns(
    group: SchedulerEvent[],
    layoutMap: Map<string, EventLayoutInfo>
  ): void {
    // Sort by start time, then end time, then id (for stability)
    const sorted = [...group].sort((a, b) =>
      a.start.getTime() - b.start.getTime() ||
      a.end.getTime() - b.end.getTime() ||
      a.id.localeCompare(b.id)
    );

    // Track end time of each column
    const colEnds: number[] = [];

    for (const event of sorted) {
      let col = -1;

      // Find first available column
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= event.start.getTime()) {
          col = i;
          break;
        }
      }

      if (col === -1) {
        col = colEnds.length;
        colEnds.push(event.end.getTime());
      } else {
        colEnds[col] = event.end.getTime();
      }

      // Store initial layout (colspan will be computed later)
      layoutMap.set(event.id, {
        col,
        colspan: 1,
        columnCount: colEnds.length,
      });
    }
  }

  /**
   * Compute colspan for an event
   * An event can span multiple columns if there's no overlapping event to its right
   */
  private computeColspan(
    event: SchedulerEvent,
    eventCol: number,
    group: SchedulerEvent[],
    layoutMap: Map<string, EventLayoutInfo>,
    columnCount: number
  ): number {
    // Find the nearest blocking column to the right
    let block = Infinity;

    for (const other of group) {
      if (other.id === event.id) continue;
      if (!this.eventsOverlap(event, other)) continue;

      const otherCol = layoutMap.get(other.id)?.col ?? 0;
      if (otherCol > eventCol) {
        block = Math.min(block, otherCol);
      }
    }

    // Calculate colspan
    if (block !== Infinity) {
      return block - eventCol;
    } else {
      return columnCount - eventCol;
    }
  }

  /**
   * Check if two events overlap in time
   */
  private eventsOverlap(a: SchedulerEvent, b: SchedulerEvent): boolean {
    return a.start < b.end && b.start < a.end;
  }

  /**
   * Calculate the relative track position for an event part (legacy method)
   * @deprecated Use getColspanLayout instead for better layout
   */
  private getRelativeTrackPosition(
    tracks: TimelineTrack[],
    part: SchedulerEventPart,
    globalTrackIndex: number
  ): { relativeIndex: number; overlappingCount: number } {
    // Find all track indices that have events overlapping with this part
    const overlappingTrackIndices: number[] = [];

    for (const track of tracks) {
      const hasOverlap = track.events.some((event) =>
        event.start < part.end && event.end > part.start
      );
      if (hasOverlap) {
        overlappingTrackIndices.push(track.index);
      }
    }

    // Sort to ensure consistent ordering
    overlappingTrackIndices.sort((a, b) => a - b);

    // Find the relative position of this event's track among overlapping tracks
    const relativeIndex = overlappingTrackIndices.indexOf(globalTrackIndex);

    return {
      relativeIndex: relativeIndex >= 0 ? relativeIndex : 0,
      overlappingCount: Math.max(1, overlappingTrackIndices.length),
    };
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
