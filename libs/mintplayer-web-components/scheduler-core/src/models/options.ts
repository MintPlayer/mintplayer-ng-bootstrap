import { DEFAULT_MESSAGES, SchedulerMessages } from './messages';
import { DEFAULT_EVENT_COLOR } from '../utils/color';
import type { SchedulerPermissions } from './permissions';
import { DayOfWeek, TimeFormat, ViewType } from './types';
import type { SchedulerEvent } from './event';

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

  // Localization
  /** Override any user-facing string (labels, announcements, instructions).
   *  Merged onto the English defaults — see SchedulerMessages. */
  messages?: Partial<SchedulerMessages>;

  /**
   * What the user may do. `false` makes the scheduler read-only; an object gives
   * per-capability control. See SchedulerPermissions — it gates AFFORDANCES and
   * gestures, it is not a security boundary.
   *
   * Replaced the old `editable` / `selectable` / `eventStartEditable` /
   * `eventDurationEditable` flags, and the never-implemented `selectMirror`,
   * `dragRevertDuration`, `dragScroll` and `snapDuration`.
   */
  permissions?: boolean | Partial<SchedulerPermissions>;

  /**
   * Fill colour for events that specify none and whose resource specifies none.
   * Previously a `'#3788d8'` literal duplicated across five files.
   */
  defaultEventColor?: string;

  // Display options
  /** Whether to show current time indicator */
  nowIndicator?: boolean;
  /** Whether to show week numbers */
  weekNumbers?: boolean;
  /** Text to display before week number */
  weekText?: string;
  /** Maximum events to show per day (true = show "+X more" link) */
  dayMaxEvents?: boolean | number;

  /**
   * What the month view's "+N more" link does.
   *
   * - `'popover'` (default, FullCalendar's default too) — open the day popover
   *   listing every event on that day.
   * - `'day'` — the previous behaviour: navigate to the day view.
   * - a function — you handle it; nothing else happens.
   */
  moreLinkBehavior?: MoreLinkBehavior;

  /**
   * What clicking a day CELL does (month view, and year-view mini-days),
   * beyond emitting `date-click`.
   *
   * Defaults to `'popover'` — click a date to see and add its events, which
   * is what the surface exists for. `date-click` still emits FIRST,
   * unconditionally, so a consumer's own handler keeps working; set `'none'`
   * to keep the click purely an event for the consumer. Clicking the day
   * NUMBER in month view always drills into the day view (the navLinks idiom)
   * and is deliberately a separate target: conflating the two would make an
   * empty cell unable to mean "create here".
   */
  dayClickAction?: 'none' | 'popover';

  /**
   * The built-in event editor: a popover anchored to the event with title,
   * start/end and colour fields plus Save / Delete / Cancel, opened by
   * double-click (double-tap), right-click, or F2 on the selected event.
   *
   * Default `true`. It emits the SAME requests every other surface emits —
   * Save is an `event-update`, Delete an `event-delete` — so a consumer's
   * handlers keep working unchanged, and it doubles as the single-pointer
   * non-drag path to change an event's times (WCAG 2.5.7). Set `false` when
   * the app ships its own editor; `event-dblclick` keeps firing either way.
   * Also exposed as the `event-editor` attribute / `eventEditor` property.
   */
  eventEditor?: boolean;

  /**
   * Whether every event is expected to name a resource.
   *
   * Default `false`: an event with no `resourceId` renders in the timeline's
   * "(No resource)" bucket row, which is the only non-lossy behaviour — the two
   * alternatives the industry ships are both silent data traps (hide the event,
   * or duplicate it into every lane where editing one appears to edit all).
   *
   * Set `true` in an app where a resource is mandatory: resource-less events are
   * still bucketed and still visible, but each one is reported once via a dev
   * warning so the gap surfaces during development instead of as a support
   * ticket. It never hides an event, and it is not a validation error — the
   * component does not own the data.
   */
  requireEventResource?: boolean;
}

/** See `SchedulerOptions.moreLinkBehavior`. */
export type MoreLinkBehavior =
  | 'popover'
  | 'day'
  | ((info: { date: Date; events: SchedulerEvent[] }) => void);

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
  messages: DEFAULT_MESSAGES,
  // Empty table, NOT DEFAULT_PERMISSIONS: per-capability fallback happens inside
  // resolveCapability, so an unspecified capability keeps its documented default.
  permissions: {},
  defaultEventColor: DEFAULT_EVENT_COLOR,
  nowIndicator: true,
  weekNumbers: false,
  weekText: 'W',
  dayMaxEvents: true,
  moreLinkBehavior: 'popover',
  dayClickAction: 'popover',
  eventEditor: true,
  requireEventResource: false,
};
