import { SchedulerEventPart, EventPosition } from '../models/event';
import { SchedulerOptions, DEFAULT_OPTIONS } from '../models/options';
import { dateService } from './date.service';

/**
 * Service for calculating event positions within the grid
 */
export class PositionService {
  /**
   * Calculate position for an event part in week/day view
   */
  calculateWeekPosition(
    part: SchedulerEventPart,
    trackIndex: number,
    totalTracks: number,
    dayIndex: number,
    totalDays: number,
    options: Partial<SchedulerOptions> = {}
  ): EventPosition {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const slotDuration = opts.slotDuration;

    // Calculate vertical position (top and height)
    const dayStart = new Date(part.start);
    dayStart.setHours(0, 0, 0, 0);

    const startSeconds = dateService.getSecondsFromMidnight(part.start);
    const endSeconds = dateService.getSecondsFromMidnight(part.end);
    const durationSeconds = endSeconds - startSeconds;

    // Parse min/max time
    const [minHour] = opts.slotMinTime.split(':').map(Number);
    const [maxHour] = opts.slotMaxTime.split(':').map(Number);
    const visibleSeconds = (maxHour - minHour) * 3600;
    const offsetSeconds = startSeconds - minHour * 3600;

    // Top position as percentage
    const top = (offsetSeconds / visibleSeconds) * 100;
    const height = (durationSeconds / visibleSeconds) * 100;

    // Calculate horizontal position (left and width)
    // Account for time gutter width (assumed 60px or ~10%)
    const gutterWidth = 10; // percentage
    const availableWidth = 100 - gutterWidth;
    const dayWidth = availableWidth / totalDays;

    // Position within the day column based on track
    const trackWidth = dayWidth / totalTracks;
    const left = gutterWidth + dayIndex * dayWidth + trackIndex * trackWidth;
    const width = trackWidth;

    return {
      top,
      left,
      width,
      height,
      zIndex: trackIndex + 1,
    };
  }

  /**
   * Calculate position for an event in timeline view
   */
  calculateTimelinePosition(
    part: SchedulerEventPart,
    trackIndex: number,
    totalTracks: number,
    viewStart: Date,
    viewEnd: Date,
    options: Partial<SchedulerOptions> = {}
  ): EventPosition {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Calculate horizontal position based on time
    const totalDuration = viewEnd.getTime() - viewStart.getTime();
    const eventStart = Math.max(part.start.getTime(), viewStart.getTime());
    const eventEnd = Math.min(part.end.getTime(), viewEnd.getTime());

    const startOffset = eventStart - viewStart.getTime();
    const duration = eventEnd - eventStart;

    const left = (startOffset / totalDuration) * 100;
    const width = (duration / totalDuration) * 100;

    // Calculate vertical position based on track
    const trackHeight = 100 / totalTracks;
    const top = trackIndex * trackHeight;
    const height = trackHeight;

    return {
      top,
      left,
      width,
      height,
      zIndex: 1,
    };
  }

  /**
   * Calculate position for an all-day event in month view
   */
  calculateMonthEventPosition(
    part: SchedulerEventPart,
    rowIndex: number,
    maxRows: number,
    startDayIndex: number,
    endDayIndex: number,
    totalDays: number = 7
  ): EventPosition {
    const dayWidth = 100 / totalDays;
    const rowHeight = 100 / maxRows;

    const left = startDayIndex * dayWidth;
    const width = (endDayIndex - startDayIndex + 1) * dayWidth;
    const top = rowIndex * rowHeight;
    const height = rowHeight;

    return {
      top,
      left,
      width,
      height,
      zIndex: rowIndex + 1,
    };
  }

  /**
   * Convert percentage-based position to pixel-based
   */
  toPixelPosition(
    position: EventPosition,
    containerWidth: number,
    containerHeight: number
  ): EventPosition {
    return {
      top: (position.top / 100) * containerHeight,
      left: (position.left / 100) * containerWidth,
      width: (position.width / 100) * containerWidth,
      height: (position.height / 100) * containerHeight,
      zIndex: position.zIndex,
    };
  }

  /**
   * Generate CSS styles from position
   */
  toStyleString(position: EventPosition, unit: 'px' | '%' = '%'): string {
    return `
      position: absolute;
      top: ${position.top}${unit};
      left: ${position.left}${unit};
      width: ${position.width}${unit};
      height: ${position.height}${unit};
      z-index: ${position.zIndex};
    `.trim().replace(/\s+/g, ' ');
  }

  /**
   * Generate CSS object from position
   */
  toStyleObject(position: EventPosition, unit: 'px' | '%' = '%'): Record<string, string> {
    return {
      position: 'absolute',
      top: `${position.top}${unit}`,
      left: `${position.left}${unit}`,
      width: `${position.width}${unit}`,
      height: `${position.height}${unit}`,
      zIndex: String(position.zIndex),
    };
  }
}

/**
 * Singleton instance of PositionService
 */
export const positionService = new PositionService();
