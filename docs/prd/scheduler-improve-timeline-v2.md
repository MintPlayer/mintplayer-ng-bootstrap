# Scheduler: Improve Timeline Layout with Colspan Algorithm

## Executive Summary

The scheduler's event layout algorithm currently uses a "max overlap per timeslice" approach that results in events being narrower than necessary. This PRD describes implementing a colspan-based algorithm (similar to Outlook/Google Calendar) that allows events to expand into available horizontal space.

## Problem Statement

### Current Behavior

Events are positioned with a fixed width based on the **maximum number of overlapping events at any point during the event's duration**. This means:

- An event from 06:00-08:00 that only overlaps with one other event at 07:00-08:00 will still be rendered at 50% width for its entire duration
- Events appear narrower than they need to be in time ranges where space is available

### Example Scenario

```
Events on Wed 24:
- Event 1: 06:00 - 08:00
- Event 2: 08:00 - 10:00
- Event 3: 07:00 - 10:00
- Event 4: 09:00 - 11:00
```

**Current Result:**
```
TIME    │ CURRENT LAYOUT (wrong)
────────┼─────────────────────────────────────────
06:00   │ ┌────────┐
        │ │ E1 33% │ (narrow even though nothing else at 06:00-07:00)
07:00   │ │        │ ┌────────┐
        │ └────────┘ │ E3 33% │
08:00   │ ┌────────┐ │        │
        │ │ E2 33% │ │        │ ┌────────┐
09:00   │ │        │ │        │ │ E4 33% │
        │ │        │ └────────┘ │        │
10:00   │ └────────┘            │        │
11:00   │                       └────────┘
```

**Expected Result (like Outlook/DayPilot):**
```
TIME    │ EXPECTED LAYOUT (correct)
────────┼─────────────────────────────────────────
06:00   │ ┌─────────────────────────────────┐
        │ │ Event 1 - 100% width            │
07:00   │ │ (full width until 07:00)        │ ┌───────────────┐
        │ └─────────────────────────────────┘ │ E3 - 50%      │
08:00   │ ┌───────────────┐                   │               │
        │ │ E2 - 50%      │                   │               │ ┌───────────────┐
09:00   │ │               │                   │               │ │ E4 - 50%      │
        │ │               │                   └───────────────┘ │               │
10:00   │ └───────────────┘                                     │               │
11:00   │                                                       └───────────────┘
```

### Root Cause

In `libs/mp-scheduler-core/src/services/timeline.service.ts`, the `getRelativeTrackPosition()` method (lines 207-234) calculates `totalTracks` by counting ALL tracks that have ANY overlap with the event's time range. This forces a fixed width based on the worst-case overlap.

```typescript
// CURRENT CODE - THE PROBLEM
private getRelativeTrackPosition(
  tracks: TimelineTrack[],
  part: SchedulerEventPart,
  globalTrackIndex: number
): { relativeIndex: number; overlappingCount: number } {
  const overlappingTrackIndices: number[] = [];

  for (const track of tracks) {
    const hasOverlap = track.events.some((event) =>
      event.start < part.end && event.end > part.start  // <-- This checks entire time range
    );
    if (hasOverlap) {
      overlappingTrackIndices.push(track.index);
    }
  }
  // ...
}
```

## Solution: Colspan-Based Layout Algorithm

### Overview

Instead of giving each event a fixed width, calculate how many columns each event can safely **span** for its entire duration. This is achieved in three phases:

1. **Build overlap groups** (connected components)
2. **Assign columns** using a greedy algorithm (current `getTimeline` already does this)
3. **Compute colspan per event** - the new piece

### Algorithm Details

#### Phase 1: Build Overlap Groups

Events belong to the same overlap group if they overlap **directly or indirectly**:

```
Event A overlaps B
Event B overlaps C
→ A, B, and C are in the same overlap group (even if A and C don't directly overlap)
```

Only events in the same overlap group influence each other's layout.

```typescript
function buildOverlapGroups(events: SchedulerEvent[]): SchedulerEvent[][] {
  const groups: SchedulerEvent[][] = [];
  const visited = new Set<string>();

  for (const event of events) {
    if (visited.has(event.id)) continue;

    // BFS/DFS to find all connected events
    const group: SchedulerEvent[] = [];
    const queue = [event];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      group.push(current);

      // Find all events that overlap with current
      for (const other of events) {
        if (!visited.has(other.id) && overlaps(current, other)) {
          queue.push(other);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

function overlaps(a: SchedulerEvent, b: SchedulerEvent): boolean {
  return a.start < b.end && b.start < a.end;
}
```

#### Phase 2: Assign Columns (existing logic)

Within each overlap group, assign events to columns:

1. Sort events by: start time, then end time, then id (for stability)
2. Keep a list of columns with their current "end time"
3. For each event:
   - Place in first column where `columnEnd <= event.start`
   - Otherwise create a new column

This is essentially what `getTimeline()` already does, but should be applied per overlap group.

#### Phase 3: Compute Colspan (NEW)

For each event, determine how many columns it can span without colliding:

```typescript
function computeColspan(
  event: SchedulerEvent,
  group: SchedulerEvent[],
  columnCount: number
): number {
  const eventCol = event.col!; // assigned column from Phase 2

  // Find the nearest blocking column to the right
  let block = Infinity;

  for (const other of group) {
    if (other === event) continue;
    if (!overlaps(event, other)) continue;
    if (other.col! > eventCol) {
      block = Math.min(block, other.col!);
    }
  }

  // Calculate colspan
  if (block !== Infinity) {
    return block - eventCol;
  } else {
    return columnCount - eventCol;
  }
}
```

#### Final Layout Values

```typescript
left  = event.col / group.columnCount
width = event.colspan / group.columnCount
```

### Visual Example: How Colspan Works

Using our example events:

```
After Phase 2 (Column Assignment):
Events sorted by start time: E1, E3, E2, E4

Event 1: col=0 (06:00-08:00) - first event, gets col 0
Event 3: col=1 (07:00-10:00) - starts at 07:00, col 0 busy until 08:00, gets col 1
Event 2: col=0 (08:00-10:00) - starts at 08:00, col 0 free (E1 ended), reuses col 0
Event 4: col=2 (09:00-11:00) - starts at 09:00, col 0 and 1 busy, gets col 2

Total columns in group: 3

After Phase 3 (Colspan Calculation):
Event 1: col=0, colspan=1
  - Overlaps with: E3 (col=1)
  - Nearest blocker to right: col=1
  - colspan = 1 - 0 = 1
  BUT WAIT - E1 ends at 08:00, E3 starts at 07:00
  E1 only overlaps E3 from 07:00-08:00
  From 06:00-07:00, E1 has NO overlapping events!

THE KEY INSIGHT: E1 should be split into segments:
  - 06:00-07:00: colspan=3 (full width, no overlap)
  - 07:00-08:00: colspan=1 (blocked by E3)
```

### Implementation Approach A: Single Colspan Per Event (Simpler)

For a simpler implementation, use a single colspan per event based on direct overlaps:

```typescript
// Event 1: overlaps with E3 (col=1), so colspan = 1 - 0 = 1
// Event 2: overlaps with E3 (col=1), E4 (col=2), nearest blocker = col 1, colspan = 1
// Event 3: overlaps with E1 (col=0), E2 (col=0), E4 (col=2), nearest blocker = col 2, colspan = 1
// Event 4: overlaps with E2 (col=0), E3 (col=1), no blocker to right, colspan = 3 - 2 = 1
```

This is still better than the current approach because events without any direct overlaps will get `colspan = columnCount`, i.e., full width.

### Implementation Approach B: Segmented Layout (Full Outlook Behavior)

For full Outlook-like behavior, split events at every unique timestamp boundary and compute colspan per segment:

```typescript
function getEventSegments(events: SchedulerEvent[]): EventSegment[] {
  // Get all unique timestamps
  const timestamps = getAllUniqueTimestamps(events).sort((a, b) => a - b);

  const segments: EventSegment[] = [];

  for (let i = 0; i < timestamps.length - 1; i++) {
    const segStart = timestamps[i];
    const segEnd = timestamps[i + 1];

    // Find all events active during this segment
    const activeEvents = events.filter(e =>
      e.start <= segStart && e.end >= segEnd
    );

    for (const event of activeEvents) {
      segments.push({
        event,
        start: segStart,
        end: segEnd,
        // colspan computed per segment
      });
    }
  }

  return segments;
}
```

**Recommendation:** Start with Approach A (simpler) as it provides significant improvement. Approach B can be a future enhancement if needed.

## Files to Modify

### Primary Changes

**`libs/mp-scheduler-core/src/services/timeline.service.ts`**

1. Add `buildOverlapGroups()` method
2. Modify `getTimeline()` to process per overlap group and assign `col` property
3. Add `computeColspan()` method
4. Modify `getTimelinedParts()` to return `colspan` and use it for width calculation
5. Update `SchedulerEvent` or create extended type with `col` and `colspan` properties

**`libs/mp-scheduler-core/src/models/event.ts`**

Add layout properties:
```typescript
interface SchedulerEventLayout {
  col: number;        // column index within overlap group
  colspan: number;    // number of columns to span
  columnCount: number; // total columns in the overlap group
}
```

### Rendering Changes

**`libs/mp-scheduler-wc/src/views/week-view.ts`**

Update event rendering to use `colspan`:
```typescript
// Current:
const widthPercent = 100 / totalTracks;
const leftPercent = trackIndex * widthPercent;

// New:
const widthPercent = (colspan / columnCount) * 100;
const leftPercent = (col / columnCount) * 100;
```

**`libs/mp-scheduler-wc/src/views/timeline-view.ts`**

Similar updates for timeline view (if applicable).

## Test Cases

### Test Case 1: No Overlap
```
Input:  E1(06:00-08:00)
Expect: E1 width=100%
```

### Test Case 2: Simple Overlap
```
Input:  E1(06:00-08:00), E2(07:00-09:00)
Expect: E1 width=50%, E2 width=50%
```

### Test Case 3: Chain Overlap
```
Input:  E1(06:00-08:00), E2(07:00-09:00), E3(08:00-10:00)
Note:   E1 overlaps E2, E2 overlaps E3, but E1 doesn't overlap E3
Expect: All in same overlap group, 2 columns
        E1: col=0, colspan=1 (blocked by E2 at col=1)
        E2: col=1, colspan=1 (no blocker to right, colspan = columnCount - col = 2 - 1 = 1)
        E3: col=0, colspan=1 (blocked by E2 at col=1)
```

### Test Case 4: The PRD Example
```
Input:  E1(06:00-08:00), E2(08:00-10:00), E3(07:00-10:00), E4(09:00-11:00)
Expect: 3 columns total
        E1: col=0, colspan=1 (blocked by E3 at col=1) - width 33%
        E2: col=0, colspan=1 (blocked by E3 at col=1) - width 33%
        E3: col=1, colspan=1 (blocked by E4 at col=2) - width 33%
        E4: col=2, colspan=1 (no blocker, 3-2=1) - width 33%

Note: With single-colspan approach, these events will all be 33%
For varying widths, need segmented approach (Approach B)
```

### Test Case 5: Event Should Expand
```
Input:  E1(06:00-10:00), E2(07:00-08:00)
Expect: 2 columns total
        E1: col=0, colspan=1 (blocked by E2) - width 50%
        E2: col=1, colspan=1 - width 50%

Note: E1 should ideally be wider at 06:00-07:00 and 08:00-10:00
      This requires Approach B (segmented)
```

### Test Case 6: Separate Overlap Groups
```
Input:  E1(06:00-07:00), E2(06:30-07:30), E3(10:00-11:00)
Expect: Two overlap groups: [E1,E2] and [E3]
        Group 1: 2 columns, E1 col=0, E2 col=1
        Group 2: 1 column, E3 col=0
        E1: width=50%, E2: width=50%, E3: width=100%
```

## Implementation Pseudocode

```typescript
interface EventWithLayout extends SchedulerEvent {
  col?: number;
  colspan?: number;
  groupColumnCount?: number;
}

function layoutEvents(events: SchedulerEvent[]): EventWithLayout[] {
  const result: EventWithLayout[] = [...events];

  // Phase 1: Build overlap groups
  const groups = buildOverlapGroups(result);

  for (const group of groups) {
    // Phase 2: Assign columns
    assignColumns(group);

    const columnCount = Math.max(...group.map(e => e.col!)) + 1;

    // Phase 3: Compute colspan
    for (const event of group) {
      event.colspan = computeColspan(event, group, columnCount);
      event.groupColumnCount = columnCount;
    }
  }

  return result;
}

function assignColumns(group: EventWithLayout[]): void {
  // Sort by start, then end, then id
  group.sort((a, b) =>
    a.start.getTime() - b.start.getTime() ||
    a.end.getTime() - b.end.getTime() ||
    a.id.localeCompare(b.id)
  );

  const colEnds: number[] = []; // end time of each column

  for (const event of group) {
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

    event.col = col;
  }
}

function computeColspan(
  event: EventWithLayout,
  group: EventWithLayout[],
  columnCount: number
): number {
  let block = Infinity;

  for (const other of group) {
    if (other.id === event.id) continue;
    if (!overlaps(event, other)) continue;
    if (other.col! > event.col!) {
      block = Math.min(block, other.col!);
    }
  }

  return block !== Infinity
    ? block - event.col!
    : columnCount - event.col!;
}
```

## Stability Considerations

### Preventing Layout Jumps During Drag

- Always use deterministic sorting (include event id as final tie-breaker)
- During drag operations, only re-layout the affected overlap group
- Consider caching column assignments and only recalculating when events are added/removed

### Multi-day Events

The current `splitInParts()` logic should continue to work. Each day's parts are laid out independently, which is correct behavior.

## Migration Path

1. Implement `buildOverlapGroups()`
2. Refactor `getTimeline()` to assign `col` property per event
3. Add `computeColspan()`
4. Update `getTimelinedParts()` to return colspan-based values
5. Update week-view and timeline-view renderers
6. Add unit tests for the new algorithm
7. Manual testing with the example scenarios

## Success Criteria

1. Events with no overlaps render at 100% width
2. Events only share space with events they actually overlap
3. No visual regressions in existing functionality
4. Layout remains stable during drag operations
5. Performance is not significantly impacted

## References

- [DayPilot Scheduler](https://doc.daypilot.org/) - Commercial scheduler with correct overlap behavior
- Google Calendar / Outlook - Reference implementations
- Original PRD: `docs/prd/scheduler-improve-timeline.md`
