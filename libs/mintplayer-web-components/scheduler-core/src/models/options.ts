import { DayOfWeek, TimeFormat, ViewType } from './types';

/**
 * Business hours configuration
 */
export interface BusinessHours {
  /** Days of the week when business hours apply (0 = Sunday) */
  daysOfWeek: DayOfWeek[];
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
}

/**
 * Header toolbar configuration
 */
export interface HeaderToolbar {
  /** Left section content */
  start?: string;
  /** Center section content */
  center?: string;
  /** Right section content */
  end?: string;
}

/**
 * Configuration options for the scheduler
 */
export interface SchedulerOptions {
  // View settings
  /** Initial view to display */
  initialView?: ViewType;
  /** Initial date to display */
  initialDate?: Date;

  // Locale settings
  /** Locale for date formatting (e.g., 'en-US') */
  locale?: string;
  /** First day of the week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek?: DayOfWeek;
  /** Timezone identifier (e.g., 'America/New_York') */
  timeZone?: string;

  // Time display settings
  /** Duration of each time slot in seconds (default: 1800 = 30 minutes) */
  slotDuration?: number;
  /** Interval between slot labels in seconds */
  slotLabelInterval?: number;
  /** Minimum time to display (e.g., '00:00:00') */
  slotMinTime?: string;
  /** Maximum time to display (e.g., '24:00:00') */
  slotMaxTime?: string;
  /** Time format (12h or 24h) */
  timeFormat?: TimeFormat;

  // Business hours
  /** Business hours configuration */
  businessHours?: BusinessHours;

  // Sizing
  /** Height of the scheduler ('auto', number in px, or CSS value) */
  height?: 'auto' | number | string;
  /** Height of the content area */
  contentHeight?: 'auto' | number;
  /** Aspect ratio for auto-sizing */
  aspectRatio?: number;
  /** Whether to expand rows to fill available space */
  expandRows?: boolean;

  // Header toolbar
  /** Header toolbar configuration */
  headerToolbar?: HeaderToolbar;

  // Interaction
  /** Whether events can be edited */
  editable?: boolean;
  /** Whether date ranges can be selected */
  selectable?: boolean;
  /** Whether to show a mirror element during selection */
  selectMirror?: boolean;
  /** Whether event duration can be changed */
  eventDurationEditable?: boolean;
  /** Whether event start time can be changed */
  eventStartEditable?: boolean;

  // Drag settings
  /** Duration of revert animation in ms */
  dragRevertDuration?: number;
  /** Whether to scroll during drag */
  dragScroll?: boolean;
  /** Snap duration in seconds */
  snapDuration?: number;

  // Display options
  /** Whether to show current time indicator */
  nowIndicator?: boolean;
  /** Whether to show week numbers */
  weekNumbers?: boolean;
  /** Text to display before week number */
  weekText?: string;
  /** Maximum events to show per day (true = show "+X more" link) */
  dayMaxEvents?: boolean | number;
}

/**
 * Default options for the scheduler
 */
export const DEFAULT_OPTIONS: Required<SchedulerOptions> = {
  initialView: 'week',
  initialDate: new Date(),
  locale: 'en-US',
  firstDayOfWeek: 1,
  timeZone: 'local',
  slotDuration: 1800,
  slotLabelInterval: 3600,
  slotMinTime: '00:00:00',
  slotMaxTime: '24:00:00',
  timeFormat: '24h',
  businessHours: {
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
  },
  height: 'auto',
  contentHeight: 'auto',
  aspectRatio: 1.35,
  expandRows: false,
  headerToolbar: {
    start: 'prev,next today',
    center: 'title',
    end: 'year,month,week,day,timeline',
  },
  editable: true,
  selectable: true,
  selectMirror: true,
  eventDurationEditable: true,
  eventStartEditable: true,
  dragRevertDuration: 500,
  dragScroll: true,
  snapDuration: 1800,
  nowIndicator: true,
  weekNumbers: false,
  weekText: 'W',
  dayMaxEvents: true,
};
