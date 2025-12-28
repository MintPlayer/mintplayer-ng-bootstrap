# Scheduler: Improve timeline calculation
## Problem
In certain cases the scheduler doesn't place the events correctly on the grid.
Example events:
- 06:00 - 08:00: Event 1
- 08:00 - 10:00: Event 2
- 07:00 - 10:00: Event 3
- 09:00 - 11:00: Event 4

## Results for current code
Initial state:

![initial state](docs/screenshots/this_code_state1.png "Initial state")

When dragging event 6 to "Tue 23"

![After dragging event 6 to "Tue 23"](docs/screenshots/this_code_state2.png "After dragging event 6 to \"Tue 23\"")

## Other schedulers
DayPilot:

![DayPilot](docs/screenshots/daypilot.png "DayPilot")

Outlook:

![Outlook](docs/screenshots/outlook.png "Outlook")

## Suggestion from ChatGPT

````markdown
You’re hitting the classic **Google / Outlook week-view calendar layout problem**:  
an event is allowed to become wider *as long as it never overlaps another event during its entire duration*.  
This **cannot** be solved correctly by doing “max overlap per timeslice → fixed width”.

Outlook and DayPilot conceptually solve this in **two distinct phases**:

---

## 1. Build overlap groups (connected components)

Work per day/column (e.g. *Wed 24*).

Events belong to the same group if they **overlap directly or indirectly**:

- Event A overlaps B  
- B overlaps C  
→ A, B, and C must be laid out together, even if A and C don’t overlap directly.

Only events inside the same overlap group influence each other’s horizontal layout.

---

## 2. Assign columns (tracks) using a greedy algorithm

Within each overlap group:

1. Sort events by:
   - start time
   - then end time
   - then stable id (important for visual stability)
2. Keep a list of columns with their current “end time”.
3. For each event:
   - place it in the first column whose `end <= event.start`
   - otherwise create a new column

This gives you:
- `event.col` → the column index
- `group.columnCount` → total number of columns (maximum simultaneous overlap)

So far, this is similar to what you’re already doing.

---

## 3. Compute **colspan** per event (this is the missing piece)

Instead of giving each event a fixed width based on the worst overlap at *any* moment,
determine how many columns an event can safely span **for its entire duration**.

### Rule

An event in column `k` may extend into columns `k+1, k+2, ...`
**as long as there is no overlapping event in those columns**.

### How to calculate it

For each event:

1. Find all overlapping events
2. Look at their assigned column indices
3. Find the **nearest blocking column to the right**

```
block = min(conflict.col) where conflict.col > event.col
```

Then:

- If a blocker exists:
  ```
  colspan = block - event.col
  ```
- If no blocker exists:
  ```
  colspan = group.columnCount - event.col
  ```

### Final layout values

```
left  = event.col / group.columnCount
width = event.colspan / group.columnCount
```

This is exactly how Outlook and DayPilot avoid the situation you’re seeing:
an event becomes wider **only where it is guaranteed not to collide**.

---

## Why your current approach fails

Your current logic:

> “At some timeslice there are 4 overlapping events → width = 25%”

That forces the event to stay narrow everywhere, even in time ranges where horizontal space is actually available.
Other schedulers solve this by **global reasoning over the entire event duration**, not by per-timeslice maxima.

---

## Optional: Outlook-style “segment layout”

Outlook sometimes appears to let an event change width vertically.
This is done by:

1. Splitting events at every unique start/end boundary
2. Recomputing colspan per segment

This is optional — most schedulers already behave correctly using a single colspan per event.

---

## Pseudocode (TypeScript-like)

```ts
type Event = {
  id: string;
  start: number; // minutes since day start
  end: number;
  col?: number;
  colspan?: number;
};

function overlaps(a: Event, b: Event): boolean {
  return a.start < b.end && b.start < a.end;
}

function layoutDay(events: Event[]) {
  const groups = buildOverlapGroups(events);

  for (const group of groups) {
    // Assign columns
    group.sort(
      (a, b) =>
        a.start - b.start ||
        a.end - b.end ||
        a.id.localeCompare(b.id)
    );

    const colEnds: number[] = [];

    for (const e of group) {
      let col = -1;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= e.start) {
          col = i;
          break;
        }
      }

      if (col === -1) {
        col = colEnds.length;
        colEnds.push(e.end);
      } else {
        colEnds[col] = e.end;
      }

      e.col = col;
    }

    const columnCount = colEnds.length;

    // Compute colspan
    for (const e of group) {
      let block = Infinity;

      for (const other of group) {
        if (other === e) continue;
        if (!overlaps(e, other)) continue;
        if (other.col! > e.col!) {
          block = Math.min(block, other.col!);
        }
      }

      e.colspan =
        block !== Infinity
          ? block - e.col!
          : columnCount - e.col!;
    }

    // Render:
    // left  = e.col / columnCount
    // width = e.colspan / columnCount
  }
}
```

---

## Two practical tips that prevent “jumping” layouts

- Always use deterministic sorting (include a stable id as final tie-breaker)
- When dragging/resizing, re-layout **only the affected overlap group**, not the entire day

---

If you want, point me to the exact file in your repository where you calculate `left` and `width`,
and I can tell you precisely where to replace your “max overlap per timeslice” logic with the `colspan` approach.
````
