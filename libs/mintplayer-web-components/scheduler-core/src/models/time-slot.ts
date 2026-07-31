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
   * Carried so a pointer create-drag can report WHICH row it happened in:
   * without it `event-create` always emitted `resourceId: undefined`, and the
   * created event landed nowhere the user was pointing. `undefined` on
   * week/day/month/year, which have no resource axis, and on the timeline's
   * unassigned bucket row.
   */
  resourceId?: string;
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
