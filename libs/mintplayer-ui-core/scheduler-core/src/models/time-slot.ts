/**
 * Represents a time slot in the scheduler grid
 */
export interface TimeSlot {
  /** Start of the time slot */
  start: Date;
  /** End of the time slot */
  end: Date;
  /**
   * Resource the slot belongs to, for views with a resource axis (timeline).
   *
   * Carried so a pointer drag can report WHICH row it is happening in:
   * without it `event-create` always emitted `resourceId: undefined`, and a
   * move-drag could not change rows at all.
   *
   * TRI-STATE, deliberately: `undefined` means "this view has no resource
   * axis" (week/day/month/year), `null` means "the timeline's unassigned
   * bucket row". The two must stay distinguishable — collapsing them is what
   * made a drop onto the bucket indistinguishable from a week-view drag, so
   * an event could never be UN-assigned by pointer. Matches the idiom of
   * `eventsByResource: Map<string | null, …>`.
   */
  resourceId?: string | null;
}

/**
 * A row of time slots with associated metadata
 */
export interface TimeSlotRow {
  /** The time stamp for this row (e.g., 09:00) */
  time: Date;
  /** Label to display (e.g., "9:00 AM") */
  label: string;
  /** Individual slots for each column (day) */
  slots: TimeSlot[];
}

/**
 * Grid structure for the scheduler
 */
export interface SchedulerGrid {
  /** Column headers (days) */
  columns: Date[];
  /** Row headers (times) */
  rows: TimeSlotRow[];
  /** All time slots flattened */
  allSlots: TimeSlot[];
}
