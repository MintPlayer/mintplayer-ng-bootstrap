import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';
import {
  nextRaf,
  mount,
  dispatchKey,
  getState,
  useFakeAnimationFrames,
} from '../../testing/scheduler-spec-fixture';

/**
 * Drag preview ghost, time-grid geometry, the normalized event/resource model, resource colour, permissions and timeline resource affordances.
 *
 * One of four files split out of the original mp-scheduler.keyboard.spec.ts so
 * vitest can run them in parallel; the fixture is shared in
 * scheduler/testing/scheduler-spec-fixture.ts.
 */
useFakeAnimationFrames();

/**
 * The drag/move ghost as a DOM element. The suite already covers
 * `state.previewEvent` (the model), which stayed correct throughout a bug
 * where the ghost was rendered invisibly or not at all — so assert the
 * element itself. jsdom can't judge stacking (no layout, and Lit's adopted
 * stylesheet isn't reachable via getComputedStyle), so paint order is covered
 * by apps/ng-bootstrap-demo-e2e/e2e/scheduler-resize.spec.ts instead; here we
 * pin the structural invariants that make stacking meaningful.
 */
describe('mp-scheduler — drag preview ghost (DOM)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('week: move-mode renders exactly one ghost, as a sibling and last child of the source', async () => {
    el = await mount('week');
    const ev = {
      id: 'standup',
      title: 'Standup',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    };
    (el as unknown as { events: unknown[] }).events = [ev];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-event.preview');
    expect(ghosts.length).toBe(1);
    const ghost = ghosts[0] as HTMLElement;
    const source = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === 'standup')!;
    expect(source).toBeDefined();
    // z-index can only order siblings of one stacking context.
    expect(ghost.parentElement).toBe(source.parentElement);
    // The unselected case relies on this DOM-order tiebreak.
    expect(ghost.parentElement!.lastElementChild).toBe(ghost);
  });

  it('week: the ghost is removed from the DOM when move-mode is cancelled', async () => {
    el = await mount('week');
    (el as unknown as { events: unknown[] }).events = [
      { id: 'standup', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-event.preview').length).toBe(1);

    dispatchKey(el, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-event.preview').length).toBe(0);
  });

  it('timeline: move-mode renders a ghost too (it is gated on previewEvent, not dragState)', async () => {
    el = await mount('timeline');
    const ev = {
      id: 'review',
      title: 'Review',
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 10, 0),
      resourceId: 'alice',
    };
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [ev] },
      { id: 'bob', title: 'Bob', events: [] },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-timeline-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Regression: this was gated on `dragState`, which only the POINTER path
    // sets — so keyboard users got no ghost on the timeline at all.
    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-timeline-event.preview');
    expect(ghosts.length).toBe(1);
    const ghost = ghosts[0] as HTMLElement;
    const source = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    ).find((e) => e.dataset['eventId'] === 'review')!;
    expect(ghost.parentElement).toBe(source.parentElement);
    // Track-aligned with its source, not spanning the whole resource row.
    expect(ghost.style.top).toBe(source.style.top);
    expect(ghost.style.height).toBe(source.style.height);
  });
});

/**
 * Geometry regressions. These pin the two defects that silently mislocated or
 * mis-ranged real (committed) events, not just drag ghosts:
 *  - slotMinTime was ignored, so every box was offset by the hidden window;
 *  - the day's last slot was stamped with an `end` before its own `start`.
 */
describe('mp-scheduler — time-grid geometry', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('positions events relative to slotMinTime, not midnight', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { options: unknown }).options = {
      slotMinTime: '08:00:00',
      slotMaxTime: '18:00:00',
      slotDuration: 1800,
    };
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [
      {
        id: 'nine',
        title: 'Nine AM',
        start: new Date(2026, 4, 12, 9, 0),
        end: new Date(2026, 4, 12, 10, 0),
      },
    ];
    el.setAttribute('view', 'day');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box).toBeTruthy();
    // 09:00 is the 3rd row of an 08:00-start grid: 2 slots x 40px.
    // Measuring from midnight gave 720px (18 slots) — off by 640.
    expect(box.style.top).toBe('80px');
    expect(box.style.height).toBe('80px'); // one hour = 2 slots
  });

  it('stamps the last slot of the day with an end AFTER its start', async () => {
    el = await mount('week');
    const slots = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-time-slot'),
    );
    expect(slots.length).toBeGreaterThan(0);
    // Every slot must be a forward-going interval. The 23:30 row used to stamp
    // end = that day's 00:00, i.e. 23.5h before its own start.
    for (const slot of slots) {
      const start = new Date(slot.dataset['start']!).getTime();
      const end = new Date(slot.dataset['end']!).getTime();
      expect(end).toBeGreaterThan(start);
    }
  });
});

/**
 * The event model is normalized: one store, keyed by resourceId, merged from the
 * flat `events` input and any events authored under `resources`. Before this,
 * week/day/month/year read the flat list while timeline read `resource.events`,
 * so the two rendered disjoint sets from the same component.
 */
describe('mp-scheduler — normalized event/resource model', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const mountWith = async (props: Record<string, unknown>, view = 'timeline') => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    for (const [k, v] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[k] = v;
    }
    el.setAttribute('view', view);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  it('shows a resource-less event in the timeline bucket row (the R2 report)', async () => {
    await mountWith({
      resources: [{ id: 'alice', title: 'Alice', events: [] }],
      // No resourceId — exactly what week view produces, since it has no
      // resource axis to supply one.
      events: [
        {
          id: 'from-week',
          title: 'Made in week view',
          start: new Date(2026, 4, 12, 9, 0),
          end: new Date(2026, 4, 12, 10, 0),
        },
      ],
    });

    const unassignedRow = el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned');
    expect(unassignedRow).not.toBeNull();
    expect(unassignedRow!.querySelector('.scheduler-resource-cell')!.textContent)
      .toContain('No resource');
    const chip = unassignedRow!.querySelector('.scheduler-timeline-event');
    expect(chip).not.toBeNull();
    expect(chip!.getAttribute('aria-label')).toContain('Made in week view');
  });

  it('no bucket row when every event has a resource', async () => {
    await mountWith({
      resources: [{ id: 'alice', title: 'Alice', events: [] }],
      events: [
        {
          id: 'assigned',
          title: 'Assigned',
          start: new Date(2026, 4, 12, 9, 0),
          end: new Date(2026, 4, 12, 10, 0),
          resourceId: 'alice',
        },
      ],
    });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).toBeNull();
    // ...and it renders in Alice's row, from the flat input — timeline no longer
    // requires the event to be nested under the resource.
    const aliceRow = el.shadowRoot!.querySelector('.scheduler-timeline-row:not(.unassigned)')!;
    expect(aliceRow.querySelector('.scheduler-timeline-event')).not.toBeNull();
  });

  it('events authored under a resource are visible in week view too', async () => {
    await mountWith(
      {
        resources: [
          {
            id: 'alice',
            title: 'Alice',
            events: [
              {
                id: 'nested',
                title: 'Nested under Alice',
                start: new Date(2026, 4, 12, 9, 0),
                end: new Date(2026, 4, 12, 10, 0),
              },
            ],
          },
        ],
      },
      'week',
    );
    const box = el.shadowRoot!.querySelector('.scheduler-event:not(.preview)');
    expect(box).not.toBeNull();
    expect(box!.getAttribute('aria-label')).toContain('Nested under Alice');
  });

  it('stamps resourceId onto events authored under a resource', async () => {
    await mountWith({
      resources: [
        {
          id: 'alice',
          title: 'Alice',
          events: [
            {
              id: 'nested',
              title: 'Nested',
              start: new Date(2026, 4, 12, 9, 0),
              end: new Date(2026, 4, 12, 10, 0),
            },
          ],
        },
      ],
    });
    const state = getState(el) as unknown as {
      eventsByResource: Map<string | null, { id: string }[]>;
    };
    expect(state.eventsByResource.get('alice')!.map((e) => e.id)).toEqual(['nested']);
    expect(state.eventsByResource.get(null) ?? []).toEqual([]);
  });

  it('honours a group’s authored collapsed flag', async () => {
    await mountWith({
      resources: [
        {
          id: 'eng',
          title: 'Engineering',
          collapsed: true,
          children: [{ id: 'bob', title: 'Bob', events: [] }],
        },
      ],
    });
    // Bob's row must not be rendered while his parent group is collapsed.
    const headers = Array.from(
      el.shadowRoot!.querySelectorAll('.scheduler-resource-cell'),
    ).map((c) => c.textContent ?? '');
    expect(headers.some((h) => h.includes('Engineering'))).toBe(true);
    expect(headers.some((h) => h.includes('Bob'))).toBe(false);
  });
});

/**
 * Resource colour applies in EVERY view, not just timeline. Resource.color and
 * Resource.eventColor had existed in the model read by nothing, and week/day/
 * month/year had no route from an event to its resource at all.
 *
 * The dynamically-added-event case is tested deliberately: it is exactly where
 * FullCalendar (#5743), Bryntum (#4005) and DevExpress (T864922) each regressed.
 */
describe('mp-scheduler — resource colour across views', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const RESOURCES = [
    { id: 'alice', title: 'Alice', eventColor: '#112233' },
    { id: 'bob', title: 'Bob', color: '#445566' },
  ];

  const mountColoured = async (view: string, events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = RESOURCES;
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', view);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const at = (h: number) => new Date(2026, 4, 12, h, 0);

  it('week view inherits the resource eventColor', async () => {
    await mountColoured('week', [
      { id: 'a', title: 'A', start: at(9), end: at(10), resourceId: 'alice' },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(17, 34, 51)'); // #112233
  });

  it('falls back to Resource.color when eventColor is absent', async () => {
    await mountColoured('day', [
      { id: 'b', title: 'B', start: at(9), end: at(10), resourceId: 'bob' },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(68, 85, 102)'); // #445566
  });

  it('the event’s own colour still wins over its resource', async () => {
    await mountColoured('week', [
      {
        id: 'c',
        title: 'C',
        start: at(9),
        end: at(10),
        resourceId: 'alice',
        color: '#ff0000',
      },
    ]);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('keeps the resource colour for an event added AFTER first render', async () => {
    await mountColoured('week', []);
    (el as unknown as { events: unknown[] }).events = [
      { id: 'late', title: 'Late', start: at(11), end: at(12), resourceId: 'alice' },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box).toBeTruthy();
    expect(box.style.backgroundColor).toBe('rgb(17, 34, 51)');
  });

  it('uses options.defaultEventColor when nothing else specifies one', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { options: unknown }).options = { defaultEventColor: '#00ff00' };
    (el as unknown as { events: unknown[] }).events = [
      { id: 'plain', title: 'Plain', start: at(9), end: at(10) },
    ];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!;
    expect(box.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });
});

/**
 * Read-only / permissions. The old `editable: false` gated POINTER gestures only,
 * so every keyboard path (Enter=create, Delete=delete, M=move-mode with
 * Shift+Arrow resize) walked straight past it — the scheduler could not be made
 * read-only at all.
 */
describe('mp-scheduler — permissions', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENT = {
    id: 'ev',
    title: 'Event',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const mountWithPerms = async (perms: unknown, attrs: Record<string, string> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    if (perms !== undefined) {
      (el as unknown as { options: unknown }).options = { permissions: perms };
    }
    (el as unknown as { events: unknown[] }).events = [EVENT];
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const focusEvent = async () => {
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event:not(.preview)')!.focus();
    await nextRaf();
  };

  it('permissions:false blocks Delete', async () => {
    await mountWithPerms(false);
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });

  it('permissions:false blocks entering move mode', async () => {
    await mountWithPerms(false);
    await focusEvent();
    dispatchKey(el, 'M');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).keyboardMoveEventId).toBeNull();
  });

  it('readonly attribute blocks Delete too (reachable from plain HTML)', async () => {
    await mountWithPerms(undefined, { readonly: '' });
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });

  it('read-only still allows grid NAVIGATION — commands are gated, not movement', async () => {
    await mountWithPerms(false);
    // Exactly one tab stop, and arrows still move the focused cell: reading a
    // schedule by keyboard is a legitimate task.
    const tabbable = el.shadowRoot!.querySelectorAll('.scheduler-time-slot[tabindex="0"]');
    expect(tabbable.length).toBe(1);
    (tabbable[0] as HTMLElement).focus();
    await nextRaf();
    const before = getState(el).focusedCell?.start.getTime();
    dispatchKey(el, 'ArrowDown');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(getState(el).focusedCell?.start.getTime()).not.toBe(before);
  });

  it('read-only shortens the keymap description instead of promising blocked gestures', async () => {
    await mountWithPerms(false);
    const eventDesc = el.shadowRoot!.getElementById('scheduler-kbd-event')!.textContent ?? '';
    expect(eventDesc).not.toContain('Delete removes');
    expect(eventDesc).toContain('move between events');
    const gridDesc = el.shadowRoot!.getElementById('scheduler-kbd-grid')!.textContent ?? '';
    expect(gridDesc).not.toContain('new event');
  });

  it('read-only renders no resize handles', async () => {
    await mountWithPerms(false);
    expect(el.shadowRoot!.querySelectorAll('.resize-handle').length).toBe(0);
  });

  it('granular: moveEvent false still permits resize handles', async () => {
    await mountWithPerms({ moveEvent: false });
    expect(el.shadowRoot!.querySelectorAll('.resize-handle').length).toBeGreaterThan(0);
  });

  it('honours event.resizable per-edge object form', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [
      { ...EVENT, resizable: { start: false, end: true } },
    ];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    // Previously only the `=== false` boolean branch was checked, so per-edge
    // locking silently did nothing.
    expect(el.shadowRoot!.querySelectorAll('.resize-handle.top').length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('.resize-handle.bottom').length).toBe(1);
  });

  it('a granular deleteEvent:false blocks only deletion', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { options: unknown }).options = { permissions: { deleteEvent: false } };
    (el as unknown as { events: unknown[] }).events = [EVENT];
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const deletions: unknown[] = [];
    el.addEventListener('event-delete', (e) => deletions.push(e));
    await focusEvent();
    dispatchKey(el, 'Delete');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(deletions.length).toBe(0);
  });
});

/**
 * M8 — timeline resource affordances. The whole point of these is that they are
 * OFF by default, so the first test is the one that matters most: an ordinary
 * scheduler must not sprout resource-editing UI.
 */
describe('mp-scheduler — timeline resource affordances', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const RESOURCES = [
    {
      id: 'team',
      title: 'Team',
      children: [{ id: 'alice', title: 'Alice', color: '#ff0000', events: [] }],
    },
  ];

  const mountTimeline = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = RESOURCES;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  /** Open a row's actions panel the way a user does — by clicking its trigger. */
  const openRowMenu = async (resourceId: string): Promise<void> => {
    el.shadowRoot!
      .querySelector<HTMLElement>(
        `.scheduler-row-menu-button[data-resource-id="${resourceId}"]`,
      )!
      .click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('renders no creation UI by default', async () => {
    await mountTimeline();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).toBeNull();
    // No permitted action means no trigger at all — an empty panel behind a
    // button is a broken promise for AT, so the button must not exist either.
    expect(el.shadowRoot!.querySelectorAll('.scheduler-row-menu-button').length).toBe(0);
    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).toBeNull();
  });

  it('createResource adds the add-bar and a per-group action, named by its group', async () => {
    await mountTimeline({ permissions: { createResource: true } });
    const bar = el.shadowRoot!.querySelector('.scheduler-timeline-addbar');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('role')).toBe('toolbar');

    // The per-row actions moved behind one trigger (M5). The GROUP row gets it —
    // only groups can be added to — and it announces itself as a dialog opener.
    const trigger = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-row-menu-button[data-resource-id="team"]',
    )!;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Actions for Team');
    // The glyph must not be part of the accessible name.
    expect(trigger.querySelector('.action-glyph')!.getAttribute('aria-hidden')).toBe('true');
    // Not a Tab stop: the grid keeps exactly one.
    expect(trigger.tabIndex).toBe(-1);

    await openRowMenu('team');
    const panel = el.shadowRoot!.querySelector('.scheduler-row-panel')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toBe('Actions for Team');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const add = panel.querySelector<HTMLElement>('[data-action="add-resource"]')!;
    // Disambiguated: N actions all called "Add" is the failure mode this guards.
    expect(add.textContent!.trim()).toBe('Add resource to Team');
    // createGroup is a separate capability and stays off.
    expect(panel.querySelectorAll('[data-action="add-group"]').length).toBe(0);
  });

  it('add-bar buttons emit resource-create / group-create with the parent id', async () => {
    await mountTimeline({ permissions: { createResource: true, createGroup: true } });
    const requests: { type: string; parentId?: string }[] = [];
    for (const type of ['resource-create', 'group-create']) {
      el.addEventListener(type, (e) =>
        requests.push({ type, parentId: (e as CustomEvent).detail.parentId }),
      );
    }
    el.shadowRoot!
      .querySelector<HTMLElement>('.scheduler-timeline-addbar [data-action="add-resource"]')!
      .click();
    await openRowMenu('team');
    el.shadowRoot!
      .querySelector<HTMLElement>('.scheduler-row-panel [data-action="add-group"]')!
      .click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(requests).toEqual([
      { type: 'resource-create', parentId: undefined },
      { type: 'group-create', parentId: 'team' },
    ]);
  });

  it('the colour swatch edits the field that actually drives the events', async () => {
    await mountTimeline({ permissions: { updateResource: true } });
    await openRowMenu('alice');
    const swatch = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.scheduler-row-panel .row-color-input[data-resource-id="alice"]',
    )!;
    // Seeded from the resource, and `color` because no eventColor is set.
    expect(swatch.value).toBe('#ff0000');
    expect(swatch.dataset['field']).toBe('color');
    let detail: { changes: Record<string, string> } | null = null;
    el.addEventListener('resource-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    swatch.value = '#00ff00';
    swatch.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).not.toBeNull();
    expect(detail!.changes).toEqual({ color: '#00ff00' });
  });

  it('a resource added after first paint appears without a date or view change', async () => {
    await mountTimeline();
    const before = el.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length;
    (el as unknown as { resources: unknown[] }).resources = [
      ...RESOURCES,
      { id: 'bob', title: 'Bob', events: [] },
    ];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-timeline-row').length).toBe(before + 1);
  });

  it('read-only removes every resource affordance even when granted', async () => {
    await mountTimeline({ permissions: { createResource: true, deleteResource: true } });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).not.toBeNull();
    el.setAttribute('readonly', '');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-addbar')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.scheduler-resource-action').length).toBe(0);
  });
});
