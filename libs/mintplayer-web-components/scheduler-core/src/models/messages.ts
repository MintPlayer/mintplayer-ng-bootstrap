/**
 * Every user-facing string the scheduler renders or announces. Consumers
 * localize by passing a partial table via `options.messages`; anything not
 * overridden falls back to the English default. Templates interpolate
 * `{placeholder}` tokens via `formatMessage` — plain substitution, no
 * pluralization rules (the only plural, slot count, uses two explicit keys).
 */
export interface SchedulerMessages {
  // Header chrome
  navLabel: string;
  previousPeriod: string;
  nextPeriod: string;
  jumpToToday: string;
  today: string;
  switchView: string;
  viewYear: string;
  viewMonth: string;
  viewWeek: string;
  viewDay: string;
  viewTimeline: string;

  // Timeline chrome
  resourcesHeader: string;
  /** Row header for the synthetic bucket holding events with no resource. */
  unassignedResource: string;
  /** Shown in the timeline when there are no resources AND no events at all. */
  noResources: string;
  /** {date} — formatted first day of the visible week */
  timelineGridLabel: string;
  /** {title} — resource group title */
  expandGroup: string;
  /** {title} — resource group title */
  collapseGroup: string;
  /** Toolbar at the foot of the resource column. */
  addResourceBarLabel: string;
  addResource: string;
  addGroup: string;
  /** {title} — every per-row action names its row, so N buttons aren't all "Add". */
  addResourceToGroup: string;
  /** {title} */
  addGroupToGroup: string;
  /** {title} */
  removeResource: string;
  /** {title} */
  resourceColor: string;

  // Month chrome
  /** {count} — number of hidden events */
  moreEvents: string;
  /** {date} — accessible name of the day popover dialog */
  dayPopoverLabel: string;
  /** {count} {events} — events is eventSingular/eventPlural */
  dayPopoverCount: string;
  eventSingular: string;
  eventPlural: string;
  /** Empty-day text inside the popover. */
  dayPopoverEmpty: string;
  /** Primary action in the popover: request an event for this day. */
  newEvent: string;
  /** Secondary action: drill into the day view. */
  showDay: string;
  closePopover: string;

  // Announcements
  /** {view} — localized view name */
  viewChanged: string;
  /** {title} */
  eventAdded: string;
  /** {title} */
  eventUpdated: string;
  /** {title} */
  eventRemoved: string;
  loadingEvents: string;
  eventsLoaded: string;
  /** {title} {minutes} — move-mode entry keymap announcement */
  moveModeEntered: string;
  /** {start} {end} {day} */
  movedTo: string;
  /** {resource} */
  movedToResource: string;
  /** {edge} {start} {end} — edge is startEdge/endEdge below */
  resizedEdge: string;
  startEdge: string;
  endEdge: string;
  moveCommitted: string;
  moveCancelled: string;
  /** {start} {end} {count} {slots} — slots is slotSingular/slotPlural */
  selection: string;
  slotSingular: string;
  slotPlural: string;
  /** {start} {end} */
  selectionCommitted: string;

  // aria-describedby keymap instructions
  gridInstructions: string;
  eventInstructions: string;
  /** Read-only variants: no create/move/resize/delete promises. */
  gridInstructionsReadOnly: string;
  eventInstructionsReadOnly: string;
  /** Announced when a command is refused by permissions. */
  actionNotAllowed: string;

  // Event accessible-name suffix: "{title}, {start}–{end}, {day}, on {resource}"
  /** {resource} */
  eventOnResource: string;
}

export const DEFAULT_MESSAGES: SchedulerMessages = {
  navLabel: 'Scheduler navigation',
  previousPeriod: 'Previous period',
  nextPeriod: 'Next period',
  jumpToToday: 'Jump to today',
  today: 'Today',
  switchView: 'Switch view',
  viewYear: 'Year',
  viewMonth: 'Month',
  viewWeek: 'Week',
  viewDay: 'Day',
  viewTimeline: 'Timeline',

  resourcesHeader: 'Resources',
  unassignedResource: '(No resource)',
  noResources: 'No resources to show.',
  timelineGridLabel: 'Resource timeline for week starting {date}',
  expandGroup: 'Expand {title}',
  collapseGroup: 'Collapse {title}',
  addResourceBarLabel: 'Add to the resource list',
  addResource: 'Add resource',
  addGroup: 'Add group',
  addResourceToGroup: 'Add resource to {title}',
  addGroupToGroup: 'Add subgroup to {title}',
  removeResource: 'Remove {title}',
  resourceColor: 'Colour for {title}',

  moreEvents: '+{count} more',
  dayPopoverLabel: 'Events on {date}',
  dayPopoverCount: '{count} {events}',
  eventSingular: 'event',
  eventPlural: 'events',
  dayPopoverEmpty: 'No events.',
  newEvent: 'New event',
  showDay: 'Show day',
  closePopover: 'Close',

  viewChanged: 'View changed to {view}.',
  eventAdded: 'Event {title} added.',
  eventUpdated: 'Event {title} updated.',
  eventRemoved: 'Event {title} removed.',
  loadingEvents: 'Loading events.',
  eventsLoaded: 'Events loaded.',
  moveModeEntered:
    'Move mode for {title}. Arrow keys nudge by {minutes} minutes; Shift with arrow keys resizes the end edge; Alt with Shift resizes the start edge; Enter commits, Escape cancels.',
  movedTo: 'Moved to {start}–{end}, {day}',
  movedToResource: 'Moved to resource {resource}.',
  resizedEdge: 'Resized {edge} edge to {start}–{end}',
  startEdge: 'start',
  endEdge: 'end',
  moveCommitted: 'Move committed.',
  moveCancelled: 'Move cancelled.',
  selection: 'Selection: {start} to {end}, {count} {slots}',
  slotSingular: 'slot',
  slotPlural: 'slots',
  selectionCommitted: 'Selection committed: {start}–{end}.',

  gridInstructionsReadOnly:
    'Use the arrow keys to move between cells. Page Up and Page Down change the period. Alt with T, Y, M, W or D switches to today, year, month, week or day view.',
  eventInstructionsReadOnly:
    'Left and Right arrows move between events.',
  actionNotAllowed: 'That action is not allowed here.',
  gridInstructions:
    'Use the arrow keys to move between cells. Hold Shift with the arrow keys to extend the selection, and press Enter to request a new event for the selection. Page Up and Page Down change the period. Alt with T, Y, M, W or D switches to today, year, month, week or day view.',
  eventInstructions:
    'Press Enter or M to move or resize the event with the arrow keys. Delete removes the event. Left and Right arrows move between events.',

  eventOnResource: 'on {resource}',
};

/**
 * Interpolate `{placeholder}` tokens. Unknown tokens are left verbatim so a
 * typo'd override is visible rather than silently swallowed.
 */
export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (token, key) =>
    key in params ? String(params[key]) : token,
  );
}

/** Merge a consumer's partial override table onto the English defaults. */
export function resolveMessages(
  overrides?: Partial<SchedulerMessages>,
): SchedulerMessages {
  return overrides ? { ...DEFAULT_MESSAGES, ...overrides } : DEFAULT_MESSAGES;
}
