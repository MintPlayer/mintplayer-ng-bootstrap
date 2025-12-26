# Scheduler Implementation Completion - PRD

## Overview

This document outlines the remaining implementation steps to complete the scheduler component overhaul. The new scheduler replaces the existing implementation entirely (no backward compatibility required).

---

## Step 1: Update tsconfig Path Mappings

### Objective
Update the path mappings to use the renamed packages (`@mintplayer/scheduler-core` and `@mintplayer/scheduler-wc`).

### Tasks
- [ ] Update `tsconfig.base.json` path mappings:
  - `@mintplayer/mp-scheduler-core` → `@mintplayer/scheduler-core`
  - `@mintplayer/mp-scheduler-wc` → `@mintplayer/scheduler-wc`
- [ ] Verify builds pass for both libraries

### Acceptance Criteria
- `nx build mp-scheduler-core` succeeds
- `nx build mp-scheduler-wc` succeeds

---

## Step 2: Add Unit Tests for Core Services

### Objective
Ensure core services are well-tested and reliable.

### Test Files to Create

#### 2.1 DateService Tests (`libs/mp-scheduler-core/src/services/date.service.spec.ts`)

```typescript
// Test cases:
- getWeekStart()
  - Returns Monday for firstDayOfWeek=1
  - Returns Sunday for firstDayOfWeek=0
  - Handles month boundary correctly

- getWeekDays()
  - Returns 7 days starting from week start
  - Handles year boundary correctly

- getMonthWeeks()
  - Returns correct number of weeks (4-6)
  - Includes days from adjacent months for complete grid

- getTimeSlots()
  - Returns correct number of slots based on duration
  - Respects minTime and maxTime

- formatTime()
  - Formats correctly in 12h mode
  - Formats correctly in 24h mode

- isSameDay() / isSameMonth() / isToday()
  - Returns correct boolean values

- addDays() / addWeeks() / addMonths()
  - Correctly adds time units
  - Handles edge cases (leap years, month boundaries)
```

#### 2.2 TimelineService Tests (`libs/mp-scheduler-core/src/services/timeline.service.spec.ts`)

```typescript
// Test cases:
- splitInParts()
  - Single-day event returns 1 part
  - Multi-day event returns correct number of parts
  - Parts have correct isStart/isEnd flags
  - Preview events work correctly

- getTimeline()
  - Non-overlapping events go to same track
  - Overlapping events go to different tracks
  - Minimizes number of tracks used
  - Empty array returns empty tracks

- filterByRange()
  - Includes events that start within range
  - Includes events that end within range
  - Includes events that span entire range
  - Excludes events completely outside range
```

#### 2.3 ResourceService Tests (`libs/mp-scheduler-core/src/services/resource.service.spec.ts`)

```typescript
// Test cases:
- flatten()
  - Flattens nested structure correctly
  - Respects collapsed state
  - Sets correct depth values

- getAllResources()
  - Returns all leaf resources
  - Works with deeply nested groups

- findResourceById() / findGroupById()
  - Finds items at any depth
  - Returns undefined for non-existent IDs

- addEventToResource() / updateEventInResource() / removeEvent()
  - Correctly mutates resource events
  - Returns new object (immutability)

- toggleGroupCollapse()
  - Toggles collapsed state correctly
```

### Acceptance Criteria
- All test files created
- `nx test mp-scheduler-core` passes
- Code coverage > 80% for services

---

## Step 3: Create Demo Page

### Objective
Create a comprehensive demo page showcasing all scheduler features.

### Location
`apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler-v2/`

### Demo Features

#### 3.1 View Switching
- Buttons to switch between Year/Month/Week/Day/Timeline views
- Keyboard shortcuts (Y/M/W/D/T)

#### 3.2 Navigation
- Previous/Next/Today buttons
- Date picker integration

#### 3.3 Event Management
- Pre-populated sample events
- Create events by dragging on empty slots
- Move events by dragging
- Resize events using handles
- Delete events (Delete key or button)
- Double-click to edit (show alert with event details)

#### 3.4 Resource Management
- Sample resource hierarchy (Departments → Teams → Members)
- Collapsible groups in timeline view
- Cross-resource event dragging

#### 3.5 Configuration Panel
- Slot duration selector (15/30/60 min)
- Time format toggle (12h/24h)
- First day of week selector
- Business hours toggle

### Sample Data Structure

```typescript
resources = [
  {
    id: 'dept-1',
    title: 'Engineering',
    children: [
      {
        id: 'team-1',
        title: 'Frontend',
        children: [
          { id: 'res-1', title: 'Alice', events: [...] },
          { id: 'res-2', title: 'Bob', events: [...] },
        ]
      },
      {
        id: 'team-2',
        title: 'Backend',
        children: [
          { id: 'res-3', title: 'Charlie', events: [...] },
        ]
      }
    ]
  },
  {
    id: 'dept-2',
    title: 'Design',
    children: [
      { id: 'res-4', title: 'Diana', events: [...] },
    ]
  }
];
```

### Files to Create

```
apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler-v2/
├── scheduler-v2.component.ts      # Demo component with signals
├── scheduler-v2.component.html    # Template with config panel
├── scheduler-v2.component.scss    # Demo page styles
└── scheduler-v2.routes.ts         # Route configuration
```

### Acceptance Criteria
- Demo page accessible at `/advanced/scheduler-v2`
- All 5 views render correctly
- Drag/drop operations work
- Events emit correctly to console
- Configuration changes apply immediately

---

## Step 4: Replace Existing Scheduler

### Objective
Remove the old scheduler implementation and make the new one the default.

### Tasks

#### 4.1 Remove Old Files
- [ ] Delete `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/`
- [ ] Delete `libs/mintplayer-ng-bootstrap/scheduler/src/components/resource-group-presenter/`
- [ ] Delete old pipes (no longer needed - calculations are in core services)
- [ ] Delete old interfaces that are now in `@mintplayer/scheduler-core`
- [ ] Delete old enums that are now in `@mintplayer/scheduler-core`
- [ ] Delete `BsTimelineService` (replaced by `TimelineService` in core)

#### 4.2 Rename New Component
- [ ] Rename `BsSchedulerV2Component` → `BsSchedulerComponent`
- [ ] Update selector from `bs-scheduler-v2` → `bs-scheduler`

#### 4.3 Update Module Exports
- [ ] Update `scheduler.module.ts`:
  ```typescript
  @NgModule({
    imports: [BsSchedulerComponent],
    exports: [BsSchedulerComponent]
  })
  export class BsSchedulerModule { }
  ```

#### 4.4 Update Index Exports
- [ ] Update `libs/mintplayer-ng-bootstrap/scheduler/src/index.ts`:
  ```typescript
  export * from './components/scheduler/scheduler.component';
  export * from './scheduler.module';

  // Re-export core types for convenience
  export {
    ViewType,
    SchedulerEvent,
    Resource,
    ResourceGroup,
    SchedulerOptions,
    TimeSlot,
  } from '@mintplayer/scheduler-core';
  ```

#### 4.5 Update Demo Page
- [ ] Update existing demo at `apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler/`
- [ ] Use new component API with signals

### File Structure After Cleanup

```
libs/mintplayer-ng-bootstrap/scheduler/src/
├── components/
│   └── scheduler/
│       └── scheduler.component.ts    # The new signal-based component
├── index.ts
└── scheduler.module.ts
```

### Acceptance Criteria
- Old scheduler files removed
- New scheduler works as `<bs-scheduler>`
- Demo page updated and functional
- No TypeScript errors
- `nx build mintplayer-ng-bootstrap` succeeds

---

## Implementation Order

1. **Step 1**: Update path mappings (5 min)
2. **Step 2**: Add unit tests (2-3 hours)
3. **Step 3**: Create demo page (1-2 hours)
4. **Step 4**: Replace existing scheduler (30 min)

---

## Dependencies

- Step 2, 3, 4 can be done in parallel after Step 1
- Step 4 should be done last to avoid breaking changes during development

---

## Rollback Plan

Since this is a complete replacement with no backward compatibility:
- Keep the old demo page as reference until new demo is validated
- Git branch allows reverting if critical issues found
- No migration path needed - consumers update to new API
