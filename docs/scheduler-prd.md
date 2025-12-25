# Scheduler Component Overhaul - Product Requirements Document

## Executive Summary

Complete overhaul of the `@mintplayer-ng-bootstrap/scheduler` component to create a fully-featured scheduling solution comparable to FullCalendar.io. The implementation will consist of a vanilla JavaScript/TypeScript Web Component as the core engine, with an Angular component wrapper utilizing signals for state management.

---

## Current State Analysis

### Existing Features
- Week and Timeline view modes
- Basic drag-and-drop (create, move, resize events)
- Resource and ResourceGroup hierarchy support
- TimelineService with `getTimeline()` for track/rail optimization
- Preview event display during drag operations
- Timeslot greying during drag (efficient approach - **to be retained**)

### Current Limitations
- Only week view available (no year/month/day views)
- No virtual scrolling for large datasets
- Tightly coupled Angular implementation
- Limited keyboard navigation
- No touch support
- No recurring event support
- Basic styling/theming

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Application                       │
├─────────────────────────────────────────────────────────────┤
│   BsSchedulerComponent (Angular Wrapper with Signals)       │
│   - Input/Output bindings                                   │
│   - Template projection                                     │
│   - Angular-specific integrations                           │
├─────────────────────────────────────────────────────────────┤
│   <mp-scheduler> Web Component                              │
│   - Core rendering engine                                   │
│   - Event handling                                          │
│   - Drag/drop operations                                    │
│   - View management                                         │
│   - Timeline/track calculation                              │
├─────────────────────────────────────────────────────────────┤
│   Scheduler Core (Pure TypeScript)                          │
│   - Data models                                             │
│   - TimelineService                                         │
│   - DateUtils                                               │
│   - Event calculations                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Functional Requirements

### FR1: View Modes

#### FR1.1: Year View
- Display 12-month calendar grid
- Show event density indicators per day (dots or count badges)
- Click on day navigates to day view
- Click on month navigates to month view
- Keyboard navigation between months

#### FR1.2: Month View
- Traditional calendar grid (6 weeks × 7 days)
- Display events inline within day cells
- Multi-day events span across cells with visual continuity
- "More events" indicator when events exceed cell capacity
- Week numbers displayed in left gutter (optional)

#### FR1.3: Week View (existing, enhanced)
- 7-day columns with configurable time slots
- All-day events section at top
- Time gutter on left (configurable: 12h/24h format)
- Current time indicator (red line)
- Configurable start/end hours
- Business hours highlighting

#### FR1.4: Day View
- Single day with expanded time slots
- Same structure as week view but single column
- Higher time resolution available (15/30/60 min slots)

#### FR1.5: Timeline View (existing, enhanced)
- Horizontal time axis
- Resources as rows
- Configurable time scale (hour/day/week/month)
- Resource grouping with collapsible sections
- Sticky headers (resource names and time headers)

### FR2: Display Modes

#### FR2.1: Grid/Classic Mode
- Traditional calendar layout
- Events stacked vertically within time slots
- Track optimization via `TimelineService.getTimeline()`

#### FR2.2: Timeline/Horizontal Mode
- Gantt-chart style horizontal layout
- Time flows left-to-right
- Resources stacked vertically
- Ideal for resource scheduling

### FR3: Event Management

#### FR3.1: Event Display
- Color-coded events (background + text color)
- Event title, time, and optional description
- Visual indicators for:
  - Recurring events (icon)
  - All-day events (banner style)
  - Multi-day events (continuous bar)
  - Tentative/confirmed status

#### FR3.2: Event Creation
- Click-and-drag on empty timeslots
- Quick-add popup on single click (optional)
- Grey-out affected timeslots during drag (retain current behavior)
- Preview event shown during creation
- Snap to time increments (configurable)

#### FR3.3: Event Editing
- Drag to move events
- Resize handles (top/bottom in grid, left/right in timeline)
- Double-click to open edit dialog (event emitted to host)
- Grey-out affected timeslots during drag/resize

#### FR3.4: Event Deletion
- Delete key when event selected
- Context menu option
- Emit event for host application to handle

### FR4: Resource Management

#### FR4.1: Resource Structure
```typescript
interface Resource {
  id: string;
  title: string;
  events: SchedulerEvent[];
  color?: string;
  metadata?: Record<string, unknown>;
}

interface ResourceGroup {
  id: string;
  title: string;
  children: (Resource | ResourceGroup)[];
  collapsed?: boolean;
  color?: string;
}
```

#### FR4.2: Resource Features
- Unlimited nesting depth
- Collapsible groups with expand/collapse animation
- Resource filtering/search
- Resource reordering via drag-drop (optional feature)
- Virtual scrolling for large resource lists

### FR5: Drag & Drop

#### FR5.1: Drag Operations
| Operation | Trigger | Visual Feedback |
|-----------|---------|-----------------|
| Create | Mousedown on empty slot | Grey-out timeslots + preview event |
| Move | Mousedown on event body | Grey-out timeslots + preview event |
| Resize Start | Mousedown on top/left handle | Grey-out timeslots + preview event |
| Resize End | Mousedown on bottom/right handle | Grey-out timeslots + preview event |

#### FR5.2: Drag Behavior
- **During drag**: Grey out all affected timeslots (current efficient approach)
- **On drop**: Call `TimelineService.getTimeline()` to recalculate tracks
- Snap to grid increments
- Constraint to valid drop zones
- Cross-resource dragging in timeline view

#### FR5.3: Touch Support
- Long-press to initiate drag
- Touch-move for dragging
- Pinch-to-zoom for timeline scale

### FR6: Navigation

#### FR6.1: Date Navigation
- Previous/Next buttons
- Today button
- Date picker integration
- Keyboard shortcuts (←/→ for prev/next)

#### FR6.2: View Navigation
- View switcher buttons (Year/Month/Week/Day/Timeline)
- Keyboard shortcuts (Y/M/W/D/T)
- Smooth transitions between views

---

## Technical Requirements

### TR1: Web Component Implementation

#### TR1.1: Component Registration
```typescript
// Core web component
class MpScheduler extends HTMLElement {
  static observedAttributes = [
    'view', 'date', 'locale', 'first-day-of-week',
    'slot-duration', 'business-hours-start', 'business-hours-end'
  ];
}
customElements.define('mp-scheduler', MpScheduler);
```

#### TR1.2: Shadow DOM Structure
```html
<mp-scheduler>
  #shadow-root
    <style>/* scoped styles */</style>
    <div class="scheduler-container">
      <header class="scheduler-header">
        <nav class="scheduler-nav"><!-- navigation --></nav>
        <div class="scheduler-toolbar"><!-- view switcher --></div>
      </header>
      <main class="scheduler-body">
        <div class="scheduler-sidebar"><!-- resources --></div>
        <div class="scheduler-content"><!-- calendar grid --></div>
      </main>
    </div>
</mp-scheduler>
```

#### TR1.3: Custom Events
```typescript
// Events emitted by web component
interface SchedulerEventMap {
  'event-click': CustomEvent<{ event: SchedulerEvent; originalEvent: MouseEvent }>;
  'event-dblclick': CustomEvent<{ event: SchedulerEvent; originalEvent: MouseEvent }>;
  'event-create': CustomEvent<{ event: SchedulerEvent; resource?: Resource }>;
  'event-update': CustomEvent<{ event: SchedulerEvent; oldEvent: SchedulerEvent }>;
  'event-delete': CustomEvent<{ event: SchedulerEvent }>;
  'date-click': CustomEvent<{ date: Date; resource?: Resource }>;
  'date-select': CustomEvent<{ start: Date; end: Date; resource?: Resource }>;
  'view-change': CustomEvent<{ view: ViewType; date: Date }>;
  'resource-expand': CustomEvent<{ group: ResourceGroup; expanded: boolean }>;
}
```

#### TR1.4: Public API
```typescript
interface MpSchedulerElement extends HTMLElement {
  // Properties
  view: ViewType;
  date: Date;
  events: SchedulerEvent[];
  resources: (Resource | ResourceGroup)[];
  options: SchedulerOptions;

  // Methods
  next(): void;
  prev(): void;
  today(): void;
  gotoDate(date: Date): void;
  changeView(view: ViewType): void;
  addEvent(event: SchedulerEvent): void;
  updateEvent(event: SchedulerEvent): void;
  removeEvent(eventId: string): void;
  getEventById(eventId: string): SchedulerEvent | null;
  refetchEvents(): void;

  // Selection
  select(start: Date, end: Date, resource?: Resource): void;
  unselect(): void;

  // Scrolling
  scrollToTime(time: string): void;
  scrollToResource(resourceId: string): void;
}
```

### TR2: Angular Component Wrapper

#### TR2.1: Signal-Based State
```typescript
@Component({
  selector: 'bs-scheduler',
  template: `<mp-scheduler #scheduler></mp-scheduler>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BsSchedulerComponent {
  // Input signals
  view = input<ViewType>('week');
  date = input<Date>(new Date());
  events = input<SchedulerEvent[]>([]);
  resources = input<(Resource | ResourceGroup)[]>([]);
  options = input<SchedulerOptions>({});

  // Computed signals
  currentWeek = computed(() => getWeekDates(this.date()));
  visibleEvents = computed(() => filterEventsByView(this.events(), this.view(), this.date()));

  // Model signals (two-way binding)
  selectedEvent = model<SchedulerEvent | null>(null);
  selectedRange = model<DateRange | null>(null);

  // Output signals (events)
  eventClick = output<SchedulerEventClickEvent>();
  eventCreate = output<SchedulerEventCreateEvent>();
  eventUpdate = output<SchedulerEventUpdateEvent>();
  eventDelete = output<SchedulerEventDeleteEvent>();
  dateClick = output<DateClickEvent>();
  dateSelect = output<DateSelectEvent>();
  viewChange = output<ViewChangeEvent>();
}
```

#### TR2.2: Effect-Based Synchronization
```typescript
constructor() {
  // Sync Angular inputs to web component
  effect(() => {
    const el = this.schedulerRef().nativeElement;
    el.view = this.view();
    el.date = this.date();
    el.events = this.events();
    el.resources = this.resources();
    el.options = this.options();
  });
}
```

### TR3: Core Services

#### TR3.1: TimelineService (enhanced)
```typescript
@Injectable()
export class TimelineService {
  /**
   * Assigns events to tracks/rails minimizing vertical space
   * Called ONLY when events are updated, NOT during drag operations
   */
  getTimeline(events: SchedulerEvent[]): TimelineTrack[];

  /**
   * Splits multi-day events into daily parts
   */
  splitInParts(event: SchedulerEvent): SchedulerEventPart[];

  /**
   * Filters events for a specific date range
   */
  filterByRange(events: SchedulerEvent[], start: Date, end: Date): SchedulerEvent[];

  /**
   * Calculates event position within a day
   */
  calculatePosition(event: SchedulerEventPart, options: PositionOptions): EventPosition;
}
```

#### TR3.2: DateService
```typescript
class DateService {
  // Week calculations
  getWeekStart(date: Date, firstDayOfWeek: number): Date;
  getWeekDays(date: Date, firstDayOfWeek: number): Date[];

  // Month calculations
  getMonthStart(date: Date): Date;
  getMonthDays(date: Date): Date[];
  getMonthWeeks(date: Date, firstDayOfWeek: number): Date[][];

  // Time calculations
  getTimeSlots(start: number, end: number, duration: number): TimeSlot[];
  roundToSlot(date: Date, slotDuration: number): Date;

  // Formatting
  formatTime(date: Date, format: '12h' | '24h'): string;
  formatDate(date: Date, locale: string): string;
}
```

### TR4: Performance Requirements

#### TR4.1: Rendering Performance
- Virtual scrolling for >100 resources
- Lazy rendering of off-screen events
- RequestAnimationFrame for drag operations
- CSS transforms for animations (GPU acceleration)

#### TR4.2: Memory Management
- Event pooling for frequently created objects
- Cleanup on view destruction
- Efficient diff algorithms for event updates

#### TR4.3: Bundle Size
- Core web component: < 50KB gzipped
- Angular wrapper: < 10KB gzipped
- Tree-shakeable optional features

---

## Data Models

### DM1: Core Types

```typescript
type ViewType = 'year' | 'month' | 'week' | 'day' | 'timeline';
type DisplayMode = 'grid' | 'timeline';

interface SchedulerEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  textColor?: string;
  resourceId?: string;
  editable?: boolean;
  draggable?: boolean;
  resizable?: boolean | { start: boolean; end: boolean };
  classNames?: string[];
  extendedProps?: Record<string, unknown>;
}

interface Resource {
  id: string;
  title: string;
  events?: SchedulerEvent[];
  color?: string;
  eventColor?: string;
  order?: number;
  extendedProps?: Record<string, unknown>;
}

interface ResourceGroup {
  id: string;
  title: string;
  children: (Resource | ResourceGroup)[];
  collapsed?: boolean;
  color?: string;
  order?: number;
}
```

### DM2: Configuration Types

```typescript
interface SchedulerOptions {
  // View settings
  initialView?: ViewType;
  initialDate?: Date;

  // Locale
  locale?: string;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday
  timeZone?: string;

  // Time display
  slotDuration?: number; // seconds, default 1800 (30 min)
  slotLabelInterval?: number; // seconds
  slotMinTime?: string; // '00:00:00'
  slotMaxTime?: string; // '24:00:00'
  timeFormat?: '12h' | '24h';

  // Business hours
  businessHours?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };

  // Sizing
  height?: 'auto' | number | string;
  contentHeight?: 'auto' | number;
  aspectRatio?: number;
  expandRows?: boolean;

  // Header
  headerToolbar?: {
    start?: string;
    center?: string;
    end?: string;
  };

  // Interaction
  editable?: boolean;
  selectable?: boolean;
  selectMirror?: boolean;
  eventDurationEditable?: boolean;
  eventStartEditable?: boolean;

  // Drag settings
  dragRevertDuration?: number;
  dragScroll?: boolean;
  snapDuration?: number; // seconds

  // Display
  nowIndicator?: boolean;
  weekNumbers?: boolean;
  weekText?: string;
  dayMaxEvents?: boolean | number;
  moreLinkClick?: 'popover' | 'week' | 'day' | ((info: MoreLinkInfo) => void);
}
```

### DM3: Event Part Types (for multi-day events)

```typescript
interface SchedulerEventPart {
  id: string;
  event: SchedulerEvent;
  start: Date;
  end: Date;
  isStart: boolean;  // Is this the starting day of the event?
  isEnd: boolean;    // Is this the ending day of the event?
  dayIndex: number;  // Which day in the sequence (0-based)
  totalDays: number; // Total days this event spans
}

interface TimelineTrack {
  index: number;
  events: SchedulerEvent[];
}

interface EventPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex: number;
}
```

---

## Implementation Phases

### Phase 1: Web Component Core (Foundation)
**Scope:**
- Base `<mp-scheduler>` web component shell
- Shadow DOM structure and scoped styling
- Attribute/property reflection
- Custom event system
- DateService implementation
- TimelineService migration/enhancement

**Deliverables:**
- `libs/mp-scheduler-core/` - Pure TypeScript core
- `libs/mp-scheduler-wc/` - Web component wrapper
- Basic week view rendering (no interaction)

### Phase 2: View Implementation
**Scope:**
- Year view implementation
- Month view implementation
- Week view (port from existing)
- Day view implementation
- Timeline view (port from existing)
- View switching and navigation

**Deliverables:**
- All 5 view modes functional
- Navigation (prev/next/today)
- Date picker integration point

### Phase 3: Interaction Layer
**Scope:**
- Event selection
- Drag-to-create (with greyed timeslots)
- Drag-to-move (with greyed timeslots)
- Drag-to-resize (with greyed timeslots)
- Keyboard navigation
- Touch support basics

**Deliverables:**
- Full drag/drop functionality
- Keyboard accessibility
- Touch-friendly interactions

### Phase 4: Resource System
**Scope:**
- Resource rendering
- ResourceGroup hierarchy
- Collapsible groups
- Resource scrolling
- Cross-resource drag/drop

**Deliverables:**
- Complete resource management
- Nested group support
- Virtual scrolling for large lists

### Phase 5: Angular Integration
**Scope:**
- BsSchedulerComponent wrapper
- Signal-based inputs/outputs
- Two-way binding support
- Template projection
- Angular-specific features

**Deliverables:**
- `libs/mintplayer-ng-bootstrap/scheduler/` - Angular wrapper
- Demo application updates
- Migration guide from current implementation

### Phase 6: Polish & Optimization
**Scope:**
- Performance optimization
- Accessibility audit (WCAG 2.1 AA)
- Theming system
- Documentation
- Unit and integration tests

**Deliverables:**
- Production-ready component
- Complete test coverage
- API documentation

---

## File Structure

```
libs/
├── mp-scheduler-core/                    # Pure TypeScript core
│   ├── src/
│   │   ├── models/
│   │   │   ├── event.ts
│   │   │   ├── resource.ts
│   │   │   ├── options.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── timeline.service.ts
│   │   │   ├── date.service.ts
│   │   │   ├── position.service.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── date-utils.ts
│   │   │   ├── dom-utils.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── package.json
│
├── mp-scheduler-wc/                      # Web Component
│   ├── src/
│   │   ├── components/
│   │   │   ├── scheduler/
│   │   │   │   ├── mp-scheduler.ts
│   │   │   │   ├── mp-scheduler.styles.ts
│   │   │   │   └── mp-scheduler.template.ts
│   │   │   ├── views/
│   │   │   │   ├── year-view.ts
│   │   │   │   ├── month-view.ts
│   │   │   │   ├── week-view.ts
│   │   │   │   ├── day-view.ts
│   │   │   │   └── timeline-view.ts
│   │   │   ├── event/
│   │   │   │   ├── event-renderer.ts
│   │   │   │   └── event-drag-handler.ts
│   │   │   ├── resource/
│   │   │   │   ├── resource-list.ts
│   │   │   │   └── resource-group.ts
│   │   │   └── shared/
│   │   │       ├── header.ts
│   │   │       ├── time-gutter.ts
│   │   │       └── now-indicator.ts
│   │   ├── state/
│   │   │   ├── scheduler-state.ts
│   │   │   └── drag-state.ts
│   │   └── index.ts
│   └── package.json
│
└── mintplayer-ng-bootstrap/
    └── scheduler/                        # Angular Wrapper
        ├── src/
        │   ├── components/
        │   │   └── scheduler/
        │   │       ├── scheduler.component.ts
        │   │       ├── scheduler.component.html
        │   │       └── scheduler.component.scss
        │   ├── directives/
        │   │   └── scheduler-event.directive.ts
        │   ├── services/
        │   │   └── scheduler.service.ts
        │   └── index.ts
        └── package.json
```

---

## API Reference

### Web Component Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `view` | string | `'week'` | Current view (year/month/week/day/timeline) |
| `date` | string | today | ISO date string for current date |
| `locale` | string | `'en-US'` | Locale for date formatting |
| `first-day-of-week` | number | `1` | First day (0=Sun, 1=Mon, etc.) |
| `slot-duration` | number | `1800` | Slot duration in seconds |
| `time-format` | string | `'24h'` | Time format (12h/24h) |
| `editable` | boolean | `true` | Allow event editing |
| `selectable` | boolean | `true` | Allow date selection |

### Web Component Events

| Event | Detail | Description |
|-------|--------|-------------|
| `event-click` | `{ event, originalEvent }` | Event clicked |
| `event-dblclick` | `{ event, originalEvent }` | Event double-clicked |
| `event-create` | `{ event, resource? }` | New event created via drag |
| `event-update` | `{ event, oldEvent }` | Event moved/resized |
| `event-delete` | `{ event }` | Event deletion requested |
| `date-click` | `{ date, resource? }` | Date cell clicked |
| `date-select` | `{ start, end, resource? }` | Date range selected |
| `view-change` | `{ view, date }` | View or date changed |

### Angular Component API

```typescript
// Inputs (signals)
view: InputSignal<ViewType>
date: InputSignal<Date>
events: InputSignal<SchedulerEvent[]>
resources: InputSignal<(Resource | ResourceGroup)[]>
options: InputSignal<SchedulerOptions>

// Two-way bindings (model signals)
selectedEvent: ModelSignal<SchedulerEvent | null>
selectedRange: ModelSignal<DateRange | null>

// Outputs
eventClick: OutputEmitterRef<SchedulerEventClickEvent>
eventCreate: OutputEmitterRef<SchedulerEventCreateEvent>
eventUpdate: OutputEmitterRef<SchedulerEventUpdateEvent>
eventDelete: OutputEmitterRef<SchedulerEventDeleteEvent>
dateClick: OutputEmitterRef<DateClickEvent>
dateSelect: OutputEmitterRef<DateSelectEvent>
viewChange: OutputEmitterRef<ViewChangeEvent>

// Methods (via ViewChild)
next(): void
prev(): void
today(): void
gotoDate(date: Date): void
changeView(view: ViewType): void
addEvent(event: SchedulerEvent): void
updateEvent(event: SchedulerEvent): void
removeEvent(eventId: string): void
scrollToTime(time: string): void
scrollToResource(resourceId: string): void
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: Full functionality via keyboard
- **Focus Management**: Visible focus indicators, logical tab order
- **Screen Reader Support**: ARIA labels, live regions for updates
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI components
- **Reduced Motion**: Respect `prefers-reduced-motion`

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous/next period |
| `↑` / `↓` | Previous/next event (in selection mode) |
| `Enter` | Select focused event/date |
| `Escape` | Cancel current operation |
| `Delete` | Delete selected event |
| `T` | Go to today |
| `Y` / `M` / `W` / `D` | Switch to year/month/week/day view |

---

## Testing Strategy

### Unit Tests
- DateService calculations
- TimelineService track assignment
- Event positioning logic
- State management

### Integration Tests
- View rendering
- Drag/drop operations
- Event creation flow
- Navigation

### E2E Tests
- Complete user workflows
- Cross-browser compatibility
- Touch device interactions
- Accessibility audit

---

## Migration Path

### From Current Implementation

1. **Phase 1**: Install new packages alongside existing
2. **Phase 2**: Update imports to new Angular wrapper
3. **Phase 3**: Migrate `resources` to new `Resource` interface (add `id` field)
4. **Phase 4**: Update event handlers to new event signature
5. **Phase 5**: Remove old scheduler package dependency

### Breaking Changes
- Events now require `id` property
- Resources now require `id` property
- Event handler signatures updated
- Some CSS class names changed

---

## Success Metrics

- Feature parity with FullCalendar.io core features
- Bundle size < 60KB gzipped (core + Angular)
- First contentful paint < 100ms
- Drag operation at 60fps
- 100% keyboard accessibility
- WCAG 2.1 AA compliance
- Zero runtime errors in production

---

## Open Questions

1. **Recurring Events**: Should we support recurring event definitions (RRule)?
2. **External Drag**: Allow dragging events from outside the scheduler?
3. **Event Overlap**: Allow events to overlap or enforce no-overlap?
4. **Undo/Redo**: Should we implement undo/redo for event operations?
5. **Print Styles**: Dedicated print stylesheet needed?
6. **Server-Side Events**: Lazy loading events from server as user navigates?

---

## Appendix: Current Implementation Reference

Key files to preserve/migrate logic from:
- `scheduler.component.ts` - Drag/drop logic (lines 326-562)
- `timeline.service.ts` - Track assignment algorithm
- `scheduler.component.scss` - Base styling patterns
- `resource-group-presenter.component.ts` - Recursive rendering

Behavior to explicitly retain:
- **Greying out timeslots during drag** - Most efficient approach for visual feedback
- **Track optimization on event update only** - Not during drag for performance
- **Multi-day event splitting** - Via `splitInParts()` method
