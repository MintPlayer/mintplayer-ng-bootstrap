import type { SchedulerEvent } from './event';

/**
 * What a user may do in the scheduler.
 *
 * Shape follows the dominant convention (DevExtreme `editing`, Kendo `editable`):
 * a `boolean | object` union, so `permissions: false` expresses the single most
 * common request — make it read-only — without spelling out ten flags, while the
 * object form covers "move but don't resize".
 *
 * **This is an honesty API, not a security boundary.** The component never mutates
 * consumer data: `event-create` is a request, `event-delete` a notification, and
 * `event-update` pre-mutates only internal state so a committed drag doesn't snap
 * back. A consumer already refuses anything by not acting on a request. Permissions
 * exist so the UI doesn't offer, announce or document actions that cannot succeed.
 * Do not rely on them to protect data — authorize on your own side.
 */
export interface SchedulerPermissions {
  /** Drag/keyboard-create a new event, and Enter on a cell or selection. */
  createEvent: boolean;
  /** Move an existing event in time (or across resources on the timeline). */
  moveEvent: boolean;
  /**
   * Drag/keyboard either edge — one flag, not two.
   *
   * Supersedes `resizeEventStart` / `resizeEventEnd`, which were a misreading
   * of FullCalendar: its `eventStartEditable` means "start editable **through
   * dragging**" (our `moveEvent`), and `eventDurationEditable` covers resize
   * as ONE flag for both edges. Splitting it globally answered a question
   * nobody asks — "no user may ever resize any start edge" — while making an
   * asymmetric commit constructible (B35).
   *
   * Per-edge locking still exists where it belongs: on the ITEM, as
   * `SchedulerEvent.resizable`'s `{ start, end }` form. That is data-dependent
   * ("this shift already clocked in; its start is pinned, you may still extend
   * it"), which is exactly what a per-item flag is for. See `resolveResizeEdge`.
   */
  resizeEvent: boolean;
  /** Delete/Backspace on a focused event. */
  deleteEvent: boolean;
  /**
   * Edit an event's non-geometric fields (title, colour) through the built-in
   * event editor. The editor's start/end fields follow `moveEvent` and the
   * resize capabilities instead — time is time, whichever surface changes it.
   */
  editEvent: boolean;
  /** Extend a multi-cell time range with Shift+Arrow or a slot drag. */
  selectRange: boolean;
  /** Add a resource row (timeline). Off by default — see the PRD. */
  createResource: boolean;
  /** Rename/recolour a resource (timeline). */
  updateResource: boolean;
  /** Remove a resource row (timeline). */
  deleteResource: boolean;
  /** Add a resource group / nested group (timeline). Off by default. */
  createGroup: boolean;

  /**
   * Optional, data-dependent veto for creation only — e.g. "not in the past",
   * "not on a locked resource".
   *
   * Deliberately narrow: it runs ONLY at pointer-down, drag completion and
   * `Enter` commit — never per cell and never per pointer-move. Driving the
   * greyed-slot feedback from it would mean a consumer callback per cell
   * (`resources x days x slotsPerDay`) on every re-render, which is the cost
   * FullCalendar documents for `selectAllow`. Slot greying is NOT driven by it.
   */
  canCreateAt?: (range: { start: Date; end: Date }, resourceId?: string) => boolean;
}

/** Every capability name, for iteration. */
export type SchedulerCapability = Exclude<keyof SchedulerPermissions, 'canCreateAt'>;

/**
 * Defaults: everything about events is allowed (matching the component's
 * behaviour before permissions existed), but creating resources and groups is
 * OFF — no surveyed calendar library ships resource-creation UI, so the default
 * stays "resources are data the app supplies".
 */
export const DEFAULT_PERMISSIONS: Readonly<Record<SchedulerCapability, boolean>> = {
  createEvent: true,
  moveEvent: true,
  resizeEvent: true,
  deleteEvent: true,
  editEvent: true,
  selectRange: true,
  createResource: false,
  updateResource: false,
  deleteResource: false,
  createGroup: false,
};

/** Per-item overrides live on the data, tri-state so `null` means "inherit". */
export interface ItemPermissionOverrides {
  editable?: boolean | null;
  draggable?: boolean | null;
  resizable?: boolean | { start: boolean; end: boolean } | null;
}

/**
 * Resolve one capability.
 *
 * Precedence: `readonly` host attribute → `permissions === false` →
 * `permissions[cap]` → per-item override → default. A per-item flag can only
 * ever *deny*; it cannot re-enable something a global setting switched off,
 * mirroring the OR-down-the-tree rule mp-query-builder uses for nested disable.
 */
export function resolveCapability(
  capability: SchedulerCapability,
  opts: {
    readonly?: boolean;
    permissions?: boolean | Partial<SchedulerPermissions>;
    event?: SchedulerEvent | null;
  },
): boolean {
  if (opts.readonly) return false;
  if (opts.permissions === false) return false;

  const table = typeof opts.permissions === 'object' && opts.permissions !== null
    ? opts.permissions
    : undefined;
  const global = table?.[capability] ?? DEFAULT_PERMISSIONS[capability];
  if (!global) return false;

  const event = opts.event;
  if (!event) return true;

  // `event.editable === false` denies every event mutation.
  if (event.editable === false) return false;

  switch (capability) {
    case 'moveEvent':
      return event.draggable !== false;
    case 'resizeEvent':
      // "Resizable at ALL" — either edge is enough. Which edge is a question
      // for `resolveResizeEdge`, and only direct manipulation gets to ask it.
      return resizableEdge(event.resizable, 'start') || resizableEdge(event.resizable, 'end');
    default:
      return true;
  }
}

/**
 * May this event be resized *from this edge*?
 *
 * Only the three direct-manipulation surfaces ask — the resize handles, the
 * pointer gesture, and Shift+Arrow vs Alt+Shift+Arrow — because there the edge
 * is a property of the **gesture**, not of the permission. Everything else
 * asks `resolveCapability('resizeEvent', …)`.
 */
export function resolveResizeEdge(
  edge: 'start' | 'end',
  opts: {
    readonly?: boolean;
    permissions?: boolean | Partial<SchedulerPermissions>;
    event?: SchedulerEvent | null;
  },
): boolean {
  if (!resolveCapability('resizeEvent', opts)) return false;
  return resizableEdge(opts.event?.resizable, edge);
}

/**
 * Honour `event.resizable`'s object form. The `{ start, end }` shape was declared
 * on the model but only the `=== false` boolean branch was ever checked, so
 * per-edge locking silently did nothing.
 */
function resizableEdge(
  resizable: boolean | { start: boolean; end: boolean } | undefined,
  edge: 'start' | 'end',
): boolean {
  if (resizable === false) return false;
  if (resizable && typeof resizable === 'object') return resizable[edge] !== false;
  return true;
}
