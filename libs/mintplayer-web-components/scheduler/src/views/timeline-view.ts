import {
  dateService,
  timelineService,
  resourceService,
  Resource,
  ResourceGroup,
  SchedulerEvent,
  SchedulerEventPart,
  isResource,
  isResourceGroup,
  FlattenedResource,
  formatMessage,
  getContrastColor,
  resolveMessages,
  resolveCapability,
  SchedulerCapability,
} from '@mintplayer/web-components/scheduler-core';
import { BaseView, formatEventAriaLabel, isSlotInSelection } from './base-view';
import { SchedulerState } from '../state/scheduler-state';

/**
 * DOM/row-map key for the synthetic unassigned row. Not a resource id — the
 * index keys unassigned events under `null`, and the row's slots carry no
 * `data-resource-id` at all.
 */
const UNASSIGNED_ROW_ID = '__mp-unassigned__';

/**
 * Timeline view renderer
 */
export class TimelineView extends BaseView {
  private rowElements: Map<string, HTMLElement> = new Map();
  /** Focus key captured just before a rebuild; see `restoreActionFocus`. */
  private pendingFocusKey: string | null = null;
  /**
   * Slot width in px. Read from `--scheduler-slot-width` so consumers can shorten
   * a default week (48 slots x 7 days x 50px = 16,800px); falls back to 50.
   */
  private get slotWidth(): number {
    const raw = getComputedStyle(this.container)
      .getPropertyValue('--scheduler-slot-width')
      .trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  }

  render(): void {
    this.captureActionFocus();
    this.clearContainer();
    this.container.classList.add('scheduler-timeline-view');

    const { date, options, resources, collapsedGroups } = this.state;
    const days = dateService.getWeekDays(date, options.firstDayOfWeek);
    const flattenedPreview = resourceService.flatten(resources, collapsedGroups);
    // +2 header rows (day labels and time labels), +1 if the unassigned bucket
    // row will render. Was +1, which under-counted by one and omitted the bucket.
    const hasUnassigned = this.hasUnassignedRow(this.state);
    const visibleRowCount =
      flattenedPreview.filter((f) => f.visible).length + 2 + (hasUnassigned ? 1 : 0);

    // Create timeline structure with role=grid (APG Grid pattern, PRD §10 Q5)
    const timeline = this.createElement('div', 'scheduler-timeline');
    timeline.setAttribute('role', 'grid');
    timeline.setAttribute(
      'aria-label',
      formatMessage(resolveMessages(options.messages).timelineGridLabel, {
        date: dateService.formatDateWithWeekday(days[0], options.locale),
      }),
    );
    timeline.setAttribute('aria-rowcount', String(visibleRowCount));
    // Keymap discoverability + Shift+Arrow range selection (FR-9).
    timeline.setAttribute('aria-describedby', 'scheduler-kbd-grid');
    timeline.setAttribute('aria-multiselectable', 'true');

    // Header (row containing day labels)
    const header = this.createElement('div', 'scheduler-timeline-header');
    header.setAttribute('role', 'row');
    header.setAttribute('aria-rowindex', '1');

    // Resource column header (top-left corner)
    const resourceHeader = this.createElement('div', 'scheduler-resource-header');
    resourceHeader.setAttribute('role', 'columnheader');
    resourceHeader.textContent = resolveMessages(this.state.options.messages).resourcesHeader;
    header.appendChild(resourceHeader);

    // Time slots header
    const slotsHeader = this.createElement('div', 'scheduler-timeline-slots-header');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      // Day header spanning multiple slots
      const daySlots = slots.length;
      const dayHeader = this.createElement('div', 'scheduler-timeline-slot-header');
      dayHeader.setAttribute('role', 'columnheader');
      dayHeader.style.width = `${daySlots * this.slotWidth}px`;
      dayHeader.textContent = dateService.formatDateWithWeekday(day, options.locale);
      dayHeader.style.borderBottom = '1px solid var(--scheduler-border-color)';
      slotsHeader.appendChild(dayHeader);
    }

    header.appendChild(slotsHeader);

    // ONE sticky block wrapping both header rows. Previously each row carried
    // `position: sticky; top: 0` itself, so once vertical scrolling worked they
    // would stack on top of each other.
    const head = this.createElement('div', 'scheduler-timeline-head');
    head.appendChild(header);
    timeline.appendChild(head);

    // Time labels row
    const timeLabelRow = this.createElement('div', 'scheduler-timeline-header');
    // A row of columnheaders needs an owning row, or the grid's owned-children
    // walk breaks (axe aria-required-children).
    timeLabelRow.setAttribute('role', 'row');
    const emptyCell = this.createElement('div', 'scheduler-resource-header');
    emptyCell.style.borderBottom = '1px solid var(--scheduler-border-color)';
    timeLabelRow.appendChild(emptyCell);

    const timeLabelsContainer = this.createElement('div', 'scheduler-timeline-slots-header');
    // Presentational wrapper between row and columnheaders (same reason as the
    // body's slots container).
    timeLabelsContainer.setAttribute('role', 'presentation');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      for (const slot of slots) {
        const slotHeader = this.createElement('div', 'scheduler-timeline-slot-header');
        slotHeader.setAttribute('role', 'columnheader');
        slotHeader.style.width = `${this.slotWidth}px`;
        slotHeader.textContent = dateService.formatTime(slot.start, options.timeFormat);
        slotHeader.style.fontSize = '10px';
        timeLabelsContainer.appendChild(slotHeader);
      }
    }

    timeLabelRow.appendChild(timeLabelsContainer);
    head.appendChild(timeLabelRow);

    // Body
    const body = this.createElement('div', 'scheduler-timeline-body');

    // Flatten resources
    const flattened = resourceService.flatten(resources, collapsedGroups);

    let rowIndex = 2; // 1 = header row above
    for (const flat of flattened) {
      if (!flat.visible) continue;

      const row = this.createResourceRow(flat, days);
      row.setAttribute('aria-rowindex', String(rowIndex));
      body.appendChild(row);
      rowIndex++;
    }

    // Synthetic bucket for events with no resource. Timeline is resource-keyed,
    // so without this an event created in week view (which has no resource axis
    // to supply an id) is unrenderable here — the component would show a blank
    // panel and read as broken. Rendered last, and only when it has content.
    if (hasUnassigned) {
      const row = this.createUnassignedRow(days);
      row.setAttribute('aria-rowindex', String(rowIndex));
      body.appendChild(row);
      rowIndex++;
    }

    timeline.appendChild(body);
    this.container.appendChild(timeline);

    const addBar = this.createAddBar();
    if (addBar) this.container.appendChild(addBar);

    // Render events
    this.renderEvents(days);

    // Reflect any pre-existing focused cell / selection.
    this.updateCellFocusAndSelection();

    // The view is rebuilt imperatively on every render, so a button that had
    // focus is a different element afterwards. Restore by stable key or a
    // keyboard user is dumped back to <body> after every add.
    this.restoreActionFocus();
  }

  /**
   * Focus key of an action control: what it does plus which row it belongs to.
   * Stable across a rebuild (unlike DOM position), and unique per control.
   */
  private actionFocusKey(el: HTMLElement): string | null {
    const action = el.dataset['action'];
    if (!action) return null;
    return [action, el.dataset['parentId'] ?? '', el.dataset['resourceId'] ?? ''].join('|');
  }

  /**
   * Remember which action control the user was on, if any, before a rebuild.
   * `activeElement` of the shadow root — the host's `document.activeElement` is
   * the `<mp-scheduler>` element itself, not the button inside it.
   */
  private captureActionFocus(): void {
    const root = this.container.getRootNode() as ShadowRoot | Document;
    const active = (root as ShadowRoot).activeElement as HTMLElement | null;
    this.pendingFocusKey =
      active && this.container.contains(active) ? this.actionFocusKey(active) : null;
  }

  private restoreActionFocus(): void {
    const key = this.pendingFocusKey;
    this.pendingFocusKey = null;
    if (!key) return;
    const match = Array.from(
      this.container.querySelectorAll<HTMLElement>('[data-action]'),
    ).find((el) => this.actionFocusKey(el) === key);
    // No match means the row the control belonged to is gone (a delete, or a
    // group that collapsed). Falling back to the add bar keeps the user inside
    // the widget instead of at the top of the document.
    const fallback = this.container.querySelector<HTMLElement>('.scheduler-add-button');
    (match ?? fallback)?.focus();
  }

  /**
   * Apply roving tabindex + aria-selected + `.selected` class to each
   * timeline-slot element. Selection is constrained to the resource pinned
   * at the anchor (PRD D1: cross-resource selection ignored).
   */
  private updateCellFocusAndSelection(): void {
    const focused = this.state.focusedCell;
    const focusedResourceId = this.state.focusedResourceId;
    const slots = this.container.querySelectorAll<HTMLElement>('.scheduler-timeline-slot');
    let foundFocused = false;
    let firstEl: HTMLElement | null = null;
    slots.forEach((slotEl) => {
      if (!firstEl) firstEl = slotEl;
      const startStr = slotEl.dataset['start'];
      const endStr = slotEl.dataset['end'];
      const resourceId = slotEl.dataset['resourceId'] ?? null;
      if (!startStr || !endStr) return;
      const slot = { start: new Date(startStr), end: new Date(endStr) };
      const isFocused =
        !!focused &&
        slot.start.getTime() === focused.start.getTime() &&
        focusedResourceId === resourceId;
      slotEl.setAttribute('tabindex', isFocused ? '0' : '-1');
      const inSelection = isSlotInSelection(slot, this.state, resourceId);
      slotEl.setAttribute('aria-selected', inSelection ? 'true' : 'false');
      slotEl.classList.toggle('selected', inSelection);
      if (isFocused) foundFocused = true;
    });
    if (!foundFocused && firstEl) (firstEl as HTMLElement).setAttribute('tabindex', '0');
  }

  private createResourceRow(flat: FlattenedResource, days: Date[]): HTMLElement {
    const { options } = this.state;
    const row = this.createElement('div', 'scheduler-timeline-row');
    row.setAttribute('role', 'row');

    if (isResourceGroup(flat.item)) {
      row.classList.add('group');
    }

    // Resource cell — role="rowheader" labels the row for SR users.
    const resourceCell = this.createElement('div', 'scheduler-resource-cell');
    resourceCell.setAttribute('role', 'rowheader');
    resourceCell.style.paddingLeft = `${8 + flat.depth * 16}px`;

    if (isResourceGroup(flat.item)) {
      // Native <button> for the expand/collapse — gets keyboard activation
      // (Enter/Space) for free, plus aria-expanded reflects collapsed state.
      const toggle = this.createElement('button', 'expand-toggle');
      toggle.type = 'button';
      const isCollapsed = this.state.collapsedGroups.has(flat.item.id);
      toggle.textContent = isCollapsed ? '▶' : '▼';
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
      toggle.setAttribute(
        'aria-label',
        formatMessage(
          resolveMessages(this.state.options.messages)[isCollapsed ? 'expandGroup' : 'collapseGroup'],
          { title: flat.item.title },
        ),
      );
      this.setData(toggle, { groupId: flat.item.id });
      resourceCell.appendChild(toggle);
    }

    const title = this.createElement('span', 'resource-title');
    title.textContent = flat.item.title;
    resourceCell.appendChild(title);

    this.appendResourceActions(resourceCell, flat.item);

    row.appendChild(resourceCell);

    // Slots container
    const slotsContainer = this.createElement('div', 'scheduler-timeline-slots');
    // Transparent for the grid's owned-children walk — a bare generic between
    // row and gridcells breaks the chain (axe aria-required-children).
    slotsContainer.setAttribute('role', 'presentation');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime
      );

      for (const slot of slots) {
        const slotEl = this.createElement('div', 'scheduler-timeline-slot');
        slotEl.setAttribute('role', 'gridcell');
        slotEl.setAttribute('tabindex', '-1');
        slotEl.setAttribute('aria-selected', 'false');
        slotEl.id = `scheduler-cell-t-${flat.item.id}-${slot.start.getTime()}`;
        slotEl.style.width = `${this.slotWidth}px`;
        this.setData(slotEl, {
          resourceId: flat.item.id,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        });
        slotsContainer.appendChild(slotEl);
      }
    }

    // Events container for this row
    if (isResource(flat.item)) {
      const eventsContainer = this.createElement('div', 'scheduler-timeline-events');
      // A CELL, not presentation: its children are role=button events, and a
      // row may not own buttons directly (axe aria-required-children).
      eventsContainer.setAttribute('role', 'gridcell');
      slotsContainer.appendChild(eventsContainer);
    }

    row.appendChild(slotsContainer);
    this.rowElements.set(flat.item.id, row);

    return row;
  }

  /**
   * Whether the synthetic bucket row renders: only when something is actually
   * unassigned, so a fully-assigned timeline shows no phantom row.
   */
  private hasUnassignedRow(state: SchedulerState): boolean {
    return (state.eventsByResource.get(null) ?? []).length > 0;
  }

  /** True when the capability is granted for the whole scheduler. */
  private can(capability: SchedulerCapability): boolean {
    return resolveCapability(capability, { permissions: this.state.resolvedPermissions });
  }

  /**
   * Per-row resource actions, rendered into the pinned rowheader cell.
   *
   * A denied action is ABSENT, not disabled: `createResource`/`createGroup`/
   * `updateResource`/`deleteResource` are all off by default, so the ordinary
   * scheduler shows none of this and only an app that manages its own resource
   * tree opts in. (A permanently-disabled button is noise for sighted users and
   * a broken promise for AT — the same rule mp-file-manager follows.)
   *
   * Every name carries the row title. N buttons all called "Add" is the classic
   * failure of a tree like this: a screen-reader user hears the same name on
   * every row and cannot tell which group they are adding to. Depth stays out of
   * it entirely — `aria-level` is invalid on these roles, so nesting is conveyed
   * by the name and the indent, not by an attribute axe flags.
   */
  private appendResourceActions(cell: HTMLElement, item: Resource | ResourceGroup): void {
    const messages = resolveMessages(this.state.options.messages);
    const actions = this.createElement('div', 'scheduler-resource-actions');

    if (isResourceGroup(item)) {
      if (this.can('createResource')) {
        actions.appendChild(
          this.createResourceAction(
            'add-resource',
            '+',
            formatMessage(messages.addResourceToGroup, { title: item.title }),
            { parentId: item.id },
          ),
        );
      }
      if (this.can('createGroup')) {
        actions.appendChild(
          this.createResourceAction(
            'add-group',
            '⊞',
            formatMessage(messages.addGroupToGroup, { title: item.title }),
            { parentId: item.id },
          ),
        );
      }
    }

    if (this.can('updateResource')) {
      actions.appendChild(this.createColorSwatch(item, messages.resourceColor));
    }

    if (this.can('deleteResource')) {
      actions.appendChild(
        this.createResourceAction(
          'delete-resource',
          '×',
          formatMessage(messages.removeResource, { title: item.title }),
          { resourceId: item.id },
        ),
      );
    }

    if (actions.childElementCount > 0) cell.appendChild(actions);
  }

  /**
   * One icon button. The glyph is `aria-hidden` and the name lives on the
   * button, so the accessible name is the localized sentence rather than "+".
   */
  private createResourceAction(
    action: string,
    glyph: string,
    label: string,
    data: Record<string, string>,
  ): HTMLElement {
    const button = this.createElement('button', 'scheduler-resource-action');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    this.setData(button, { action, ...data });
    const icon = this.createElement('span', 'action-glyph');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = glyph;
    button.appendChild(icon);
    return button;
  }

  /**
   * Native `<input type="color">` for the resource's colour — the recolour half
   * of R7. Native because it is keyboard-operable, localized and screen-reader
   * labelled by the platform for free; a custom swatch grid would have to
   * re-earn all three.
   *
   * It edits whichever field actually drives the rendered events: `eventColor`
   * wins over `color` in `resolveEventColor`, so writing `color` on a resource
   * that has an `eventColor` would look like the control did nothing.
   */
  private createColorSwatch(item: Resource | ResourceGroup, labelTemplate: string): HTMLElement {
    const resource = item as Resource;
    const field = resource.eventColor ? 'eventColor' : 'color';
    const current = resource.eventColor ?? item.color;

    const input = this.createElement('input', 'scheduler-resource-color');
    input.type = 'color';
    input.setAttribute('aria-label', formatMessage(labelTemplate, { title: item.title }));
    input.title = input.getAttribute('aria-label') ?? '';
    // `<input type="color">` accepts ONLY `#rrggbb`; anything else silently
    // resets it to black, which reads as "this resource is black" rather than
    // "this resource has a colour I cannot show".
    if (current && /^#[0-9a-f]{6}$/i.test(current)) input.value = current;
    this.setData(input, { action: 'set-resource-color', resourceId: item.id, field });
    return input;
  }

  /**
   * Root-level "Add resource" / "Add group" bar, pinned to the bottom of the
   * frozen resource column (the spreadsheet/Jira idiom: creation lives at the
   * end of the list, in the column the new row will appear in).
   *
   * Deliberately a sibling of the grid, not a row inside it: a row whose only
   * content is buttons has to fake a rowheader, inflates `aria-rowcount`, and
   * puts Tab stops inside a roving-tabindex grid. Outside, it is just a toolbar.
   */
  private createAddBar(): HTMLElement | null {
    const canResource = this.can('createResource');
    const canGroup = this.can('createGroup');
    if (!canResource && !canGroup) return null;

    const messages = resolveMessages(this.state.options.messages);
    const bar = this.createElement('div', 'scheduler-timeline-addbar');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', messages.addResourceBarLabel);

    if (canResource) {
      const button = this.createElement('button', 'scheduler-add-button');
      button.type = 'button';
      button.textContent = messages.addResource;
      this.setData(button, { action: 'add-resource' });
      bar.appendChild(button);
    }
    if (canGroup) {
      const button = this.createElement('button', 'scheduler-add-button');
      button.type = 'button';
      button.textContent = messages.addGroup;
      this.setData(button, { action: 'add-group' });
      bar.appendChild(button);
    }
    return bar;
  }

  /**
   * The "(No resource)" bucket row.
   *
   * Structurally identical to a resource row so keyboard nav, roving tabindex and
   * the grid ARIA chain all treat it as one more row — but its slots carry NO
   * `data-resource-id`, so a create-drag started here produces an unassigned
   * event rather than inventing membership of a resource that doesn't exist.
   */
  private createUnassignedRow(days: Date[]): HTMLElement {
    const { options } = this.state;
    const row = this.createElement('div', 'scheduler-timeline-row', 'unassigned');
    row.setAttribute('role', 'row');

    const resourceCell = this.createElement('div', 'scheduler-resource-cell');
    resourceCell.setAttribute('role', 'rowheader');
    resourceCell.style.paddingLeft = '8px';
    const title = this.createElement('span');
    title.textContent = resolveMessages(options.messages).unassignedResource;
    resourceCell.appendChild(title);
    row.appendChild(resourceCell);

    const slotsContainer = this.createElement('div', 'scheduler-timeline-slots');
    slotsContainer.setAttribute('role', 'presentation');

    for (const day of days) {
      const slots = dateService.getTimeSlots(
        day,
        options.slotDuration,
        options.slotMinTime,
        options.slotMaxTime,
      );
      for (const slot of slots) {
        const slotEl = this.createElement('div', 'scheduler-timeline-slot');
        slotEl.setAttribute('role', 'gridcell');
        slotEl.setAttribute('tabindex', '-1');
        slotEl.setAttribute('aria-selected', 'false');
        slotEl.id = `scheduler-cell-t-${UNASSIGNED_ROW_ID}-${slot.start.getTime()}`;
        slotEl.style.width = `${this.slotWidth}px`;
        // Deliberately no resourceId — see the doc comment.
        this.setData(slotEl, {
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        });
        slotsContainer.appendChild(slotEl);
      }
    }

    const eventsContainer = this.createElement('div', 'scheduler-timeline-events');
    eventsContainer.setAttribute('role', 'gridcell');
    slotsContainer.appendChild(eventsContainer);

    row.appendChild(slotsContainer);
    this.rowElements.set(UNASSIGNED_ROW_ID, row);

    return row;
  }

  private renderEvents(days: Date[]): void {
    const { resources, options } = this.state;

    const weekStart = days[0];
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Get total slots per day
    const slotsPerDay = dateService.getTimeSlots(
      days[0],
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    ).length;

    const totalSlots = slotsPerDay * 7;
    const totalWidth = totalSlots * this.slotWidth;

    // Every row we render, including the synthetic unassigned bucket. Its id is
    // `null` in the index; UNASSIGNED_ROW_ID is only the DOM/row-map key.
    const rows: { resourceId: string | null; title: string }[] = [
      ...resourceService.getAllResources(resources).map((r) => ({
        resourceId: r.id as string | null,
        title: r.title,
      })),
      ...(this.rowElements.has(UNASSIGNED_ROW_ID)
        ? [
            {
              resourceId: null,
              title: resolveMessages(options.messages).unassignedResource,
            },
          ]
        : []),
    ];

    for (const { resourceId, title: rowTitle } of rows) {
      const row = this.rowElements.get(resourceId ?? UNASSIGNED_ROW_ID);
      if (!row) continue;

      const eventsContainer = row.querySelector('.scheduler-timeline-events');
      if (!eventsContainer) continue;

      // Clear existing events
      eventsContainer.innerHTML = '';

      // Events come from the normalized store, keyed by resourceId — NOT from
      // `resource.events`, which was a second store that made this view render a
      // disjoint set from week/day/month/year.
      const resourceEvents = (this.state.eventsByResource.get(resourceId) ?? []).filter(
        (e) => e.start < weekEnd && e.end > weekStart,
      );

      // Create event parts for layout (don't split into daily parts for timeline view)
      // For timeline view, treat each event as a single entity for layout purposes
      const allParts: SchedulerEventPart[] = resourceEvents.map((event) => ({
        id: event.id,
        event: event,
        start: event.start,
        end: event.end,
        isStart: true,
        isEnd: true,
        dayIndex: 0,
        totalDays: 1,
      }));

      // Get timelened parts with track info (uses colspan algorithm)
      const timelinedParts = timelineService.getTimelinedParts(allParts);

      // Render each event part
      for (const { part, trackIndex, totalTracks, colspan } of timelinedParts) {
        if (!part.event) continue;

        const eventEl = this.createEventElement(
          part.event,
          trackIndex,
          totalTracks,
          colspan,
          weekStart,
          totalWidth,
          options.slotDuration ?? 1800,
          rowTitle,
        );
        eventsContainer.appendChild(eventEl);
      }
    }
  }

  private createEventElement(
    event: SchedulerEvent,
    trackIndex: number,
    totalTracks: number,
    colspan: number,
    viewStart: Date,
    totalWidth: number,
    slotDuration: number,
    resourceTitle: string | null = null,
  ): HTMLElement {
    const eventEl = this.createElement('div', 'scheduler-timeline-event');
    const isSelected = this.state.selectedEvent?.id === event.id;
    const inMoveMode = this.state.keyboardMoveEventId === event.id;
    eventEl.setAttribute('role', 'button');
    // Every event is Tab-reachable (PRD §6.1) — flipped from roving tabindex
    // so users can Tab through events in document order.
    eventEl.setAttribute('tabindex', '0');
    eventEl.setAttribute(
      'aria-label',
      formatEventAriaLabel(event, resourceTitle, this.state.options),
    );
    // Selection state on the button token that supports it (see week-view).
    eventEl.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    // Move/resize discoverability hint (FR-9) — read by SRs on focus.
    eventEl.setAttribute('aria-describedby', 'scheduler-kbd-event');
    if (isSelected) eventEl.classList.add('selected');
    void inMoveMode;

    // Clamp event to view bounds
    const eventStart = Math.max(event.start.getTime(), viewStart.getTime());
    const viewEndTime = viewStart.getTime() + 7 * 24 * 60 * 60 * 1000;
    const eventEnd = Math.min(event.end.getTime(), viewEndTime);

    // Calculate position
    const startOffset = eventStart - viewStart.getTime();
    const duration = eventEnd - eventStart;
    const viewDuration = viewEndTime - viewStart.getTime();

    const left = (startOffset / viewDuration) * totalWidth;
    const width = Math.max((duration / viewDuration) * totalWidth, 20);

    // Calculate vertical position based on track and colspan
    // colspan allows events to span multiple tracks when there's no blocking event
    const top = (trackIndex / totalTracks) * 100;
    const heightPercent = (colspan / totalTracks) * 100;

    eventEl.style.left = `${left}px`;
    eventEl.style.width = `${width}px`;
    eventEl.style.top = `${top}%`;
    eventEl.style.height = `${heightPercent}%`;
    // Fill + contrast text, resolving the resource's colour (see BaseView).
    this.applyEventColors(eventEl, event);

    this.setData(eventEl, { eventId: event.id });

    // Content wrapper clips the title independently of the event box, which
    // stays overflow: visible so the selected-state resize handles/glyphs can
    // straddle the left/right edges (see week-view).
    const content = this.createElement('div', 'event-content');
    const title = this.createElement('div', 'event-title');
    title.textContent = event.title;
    content.appendChild(title);
    eventEl.appendChild(content);

    // Horizontal resize handles — only on the edges whose true start/end is
    // inside the visible week (the rendered box is clamped to view bounds,
    // and dragging a clamped edge would misrepresent the event's real time).
    this.appendResizeHandles(
      eventEl,
      {
        id: event.id,
        event,
        start: event.start,
        end: event.end,
        isStart: event.start.getTime() >= viewStart.getTime(),
        isEnd: event.end.getTime() <= viewEndTime,
        dayIndex: 0,
        totalDays: 1,
      },
      ['left', 'right'],
    );

    return eventEl;
  }

  /**
   * Dashed ghost showing where the event will land. Mirrors
   * week-view.renderPreviewEvent for the horizontal axis.
   *
   * Gated on `previewEvent` alone — NOT on `dragState`, which only the pointer
   * drag path writes. Keyboard move-mode sets `previewEvent` with no
   * `dragState`, so requiring it hid the ghost from keyboard users on this
   * view while week/day showed it.
   */
  private renderPreviewEvent(days: Date[]): void {
    this.container.querySelector('.scheduler-timeline-event.preview')?.remove();

    const { dragState, previewEvent, resources, options } = this.state;
    if (!previewEvent) return;

    // Resource nudges (move-mode Up/Down) put the target row on the preview
    // itself; fall back to whichever row currently owns the dragged event.
    const draggedId = dragState?.event?.id ?? this.state.keyboardMoveEventId;
    const resourceId =
      previewEvent.resourceId ??
      (draggedId
        ? resourceService
            .getAllResources(resources)
            .find((r) => (r.events ?? []).some((e) => e.id === draggedId))?.id
        : undefined) ??
      // A CREATE drag has no source event and (until PreviewEvent.resourceId is
      // populated for pointer drags) no resource on the preview either, so fall
      // back to the row the gesture is happening in. Without this a create-drag
      // on a timeline row showed no ghost at all.
      this.state.selectionResourceId ??
      this.state.focusedResourceId ??
      undefined;
    if (!resourceId) return;
    const row = this.rowElements.get(resourceId);
    const eventsContainer = row?.querySelector('.scheduler-timeline-events');
    if (!eventsContainer) return;

    const slotsPerDay = dateService.getTimeSlots(
      days[0],
      options.slotDuration,
      options.slotMinTime,
      options.slotMaxTime
    ).length;
    const totalWidth = slotsPerDay * 7 * this.slotWidth;

    const viewStart = days[0];
    const viewEndTime = viewStart.getTime() + 7 * 24 * 60 * 60 * 1000;
    const start = Math.max(previewEvent.start.getTime(), viewStart.getTime());
    const end = Math.min(previewEvent.end.getTime(), viewEndTime);
    const viewDuration = viewEndTime - viewStart.getTime();

    const previewEl = this.createElement('div', 'scheduler-timeline-event', 'preview');
    previewEl.style.left = `${((start - viewStart.getTime()) / viewDuration) * totalWidth}px`;
    previewEl.style.width = `${Math.max(((end - start) / viewDuration) * totalWidth, 20)}px`;
    // Sit on the source event's track. Without this the ghost inherits the
    // full-row top/height from .scheduler-timeline-event and covers every
    // track of a multi-track resource row.
    if (draggedId) {
      // dataset match rather than an attribute selector: event ids are
      // consumer-supplied and would need CSS escaping.
      const sourceEl = Array.from(
        eventsContainer.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
      ).find((el) => el.dataset['eventId'] === draggedId);
      if (sourceEl) {
        previewEl.style.top = sourceEl.style.top;
        previewEl.style.height = sourceEl.style.height;
      }
    }

    eventsContainer.appendChild(previewEl);
  }

  update(state: SchedulerState): void {
    const dateChanged = this.state.date.getTime() !== state.date.getTime();
    const optionsChanged = this.optionsRequireRerender(this.state.options, state.options);
    // WHICH rows exist is decided in render(), so an update that changes the row
    // set has to rebuild rather than just refresh events. Without this a resource
    // added after first paint never appeared — the reason the timeline looked
    // static no matter what a consumer did to `resources`.
    //
    // Identity comparisons: the state manager replaces these references instead
    // of mutating them, and a per-render deep compare of the whole tree is not
    // worth paying for on the drag path.
    const rowsChanged =
      this.state.resources !== state.resources ||
      this.state.collapsedGroups !== state.collapsedGroups ||
      this.state.resolvedPermissions !== state.resolvedPermissions ||
      this.hasUnassignedRow(this.state) !== this.hasUnassignedRow(state);
    this.state = state;

    if (dateChanged || optionsChanged || rowsChanged) {
      this.render();
      return;
    }

    // Update greyed slots
    this.updateGreyedSlots();

    // Re-render events
    const days = dateService.getWeekDays(state.date, state.options.firstDayOfWeek);
    this.renderEvents(days);

    // Render drag preview ghost (no-op outside a drag)
    this.renderPreviewEvent(days);

    // Refresh cell focus + selection styling.
    this.updateCellFocusAndSelection();
  }

  private optionsRequireRerender(oldOpts: SchedulerState['options'], newOpts: SchedulerState['options']): boolean {
    return oldOpts.slotDuration !== newOpts.slotDuration ||
           oldOpts.timeFormat !== newOpts.timeFormat ||
           oldOpts.firstDayOfWeek !== newOpts.firstDayOfWeek ||
           oldOpts.slotMinTime !== newOpts.slotMinTime ||
           oldOpts.slotMaxTime !== newOpts.slotMaxTime ||
           oldOpts.locale !== newOpts.locale;
  }

  private updateGreyedSlots(): void {
    const { dragState, previewEvent } = this.state;

    // Clear all greyed slots
    const allSlots = this.container.querySelectorAll('.scheduler-timeline-slot');
    allSlots.forEach((slot) => slot.classList.remove('greyed'));

    if (!dragState || !previewEvent) return;

    // Grey out slots that overlap with the preview
    allSlots.forEach((slot) => {
      const slotStart = new Date((slot as HTMLElement).dataset['start'] ?? '');
      const slotEnd = new Date((slot as HTMLElement).dataset['end'] ?? '');

      if (slotStart < previewEvent.end && slotEnd > previewEvent.start) {
        slot.classList.add('greyed');
      }
    });
  }

  destroy(): void {
    this.rowElements.clear();
    this.clearContainer();
  }
}
