import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

/**
 * M5 — the row-actions panel (R1, R3, R4).
 *
 * The four controls that used to sit inline in the pinned resource column took
 * 102px of a 200px column and left the title about 50px. They now live behind
 * one 24px trigger. This is a LAYOUT change: every action keeps its data-action,
 * its permission gate and the event it emits, which is what these specs pin down.
 */

const RESOURCES = [
  {
    id: 'team',
    title: 'Team',
    color: '#3788d8',
    children: [{ id: 'alice', title: 'Alice', color: '#ff0000', events: [] }],
  },
];

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(permissions: Record<string, boolean>): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  el.setAttribute('locale', 'en-US');
  (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
  (el as unknown as { resources: unknown[] }).resources = RESOURCES;
  (el as unknown as { options: unknown }).options = { permissions };
  el.setAttribute('view', 'timeline');
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

function trigger(el: MpScheduler, resourceId: string): HTMLElement | null {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-row-menu-button')].find(
    (b) => b.dataset['resourceId'] === resourceId,
  ) ?? null;
}

async function open(el: MpScheduler, resourceId: string): Promise<HTMLElement> {
  trigger(el, resourceId)!.click();
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el.shadowRoot!.querySelector<HTMLElement>('.scheduler-row-panel')!;
}

const ALL = {
  createResource: true,
  createGroup: true,
  updateResource: true,
  deleteResource: true,
};

afterEach(() => {
  document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
});

describe('mp-scheduler — the row panel is a dialog, not a menu', () => {
  it('renders role=dialog with a name that carries the row title', async () => {
    const el = await mount(ALL);
    const panel = await open(el, 'alice');

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toBe('Actions for Alice');
  });

  it('owns a native colour input — legal in a dialog, invalid in a menu', async () => {
    const el = await mount(ALL);
    const panel = await open(el, 'alice');

    const input = panel.querySelector<HTMLInputElement>('.row-color-input')!;
    expect(input).not.toBeNull();
    expect(input.type).toBe('color');
    // Named, because the platform only labels it if we ask.
    expect(input.getAttribute('aria-label')).toBe('Colour for Alice');
    // role=menu owns only menuitem-family children; this is why the panel is a
    // dialog. Guard against anyone "simplifying" it back.
    expect(panel.getAttribute('role')).not.toBe('menu');
  });
});

describe('mp-scheduler — the panel preserves every action (R4)', () => {
  it('emits resource-create with the group as parent', async () => {
    const el = await mount(ALL);
    const seen: unknown[] = [];
    el.addEventListener('resource-create', (e) => seen.push((e as CustomEvent).detail));

    const panel = await open(el, 'team');
    panel.querySelector<HTMLElement>('[data-action="add-resource"]')!.click();

    expect(seen).toHaveLength(1);
    expect((seen[0] as { parentId: string }).parentId).toBe('team');
  });

  it('emits group-create with the group as parent', async () => {
    const el = await mount(ALL);
    const seen: unknown[] = [];
    el.addEventListener('group-create', (e) => seen.push((e as CustomEvent).detail));

    const panel = await open(el, 'team');
    panel.querySelector<HTMLElement>('[data-action="add-group"]')!.click();

    expect(seen).toHaveLength(1);
    expect((seen[0] as { parentId: string }).parentId).toBe('team');
  });

  it('emits resource-delete for the row it was opened from', async () => {
    const el = await mount(ALL);
    const seen: { resource: { id: string } }[] = [];
    el.addEventListener('resource-delete', (e) =>
      seen.push((e as CustomEvent).detail as { resource: { id: string } }),
    );

    const panel = await open(el, 'alice');
    panel.querySelector<HTMLElement>('[data-action="delete-resource"]')!.click();

    expect(seen).toHaveLength(1);
    expect(seen[0].resource.id).toBe('alice');
  });

  it('emits resource-update from the colour input, on the field that drives events', async () => {
    const el = await mount(ALL);
    let detail: { changes: Record<string, string> } | null = null;
    el.addEventListener('resource-update', (e) => {
      detail = (e as CustomEvent).detail as { changes: Record<string, string> };
    });

    const panel = await open(el, 'alice');
    const input = panel.querySelector<HTMLInputElement>('.row-color-input')!;
    expect(input.value).toBe('#ff0000'); // seeded from the resource
    input.value = '#00ff00';
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(detail).not.toBeNull();
    expect(detail!.changes).toEqual({ color: '#00ff00' });
  });
});

describe('mp-scheduler — the trigger states what it does', () => {
  it('flips aria-expanded in step with the panel', async () => {
    const el = await mount(ALL);
    const btn = trigger(el, 'alice')!;

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await open(el, 'alice');
    expect(trigger(el, 'alice')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('is absent entirely when no action is permitted', async () => {
    const el = await mount({});

    // Not "present but disabled": an empty panel behind a button is a broken
    // promise for AT, and a permanently dead control is noise for everyone else.
    expect(el.shadowRoot!.querySelectorAll('.scheduler-row-menu-button')).toHaveLength(0);
  });

  it('offers add-resource only on groups, never on a leaf row', async () => {
    const el = await mount(ALL);

    const leaf = await open(el, 'alice');
    expect(leaf.querySelector('[data-action="add-resource"]')).toBeNull();
    expect(leaf.querySelector('[data-action="delete-resource"]')).not.toBeNull();
  });

  it('carries the focus-restore key the imperative rebuild needs', async () => {
    const el = await mount(ALL);
    const btn = trigger(el, 'alice')!;

    // captureActionFocus/restoreActionFocus key off exactly these two. Without
    // them a rebuild after any action drops focus to <body> — the live bug the
    // expand toggle still had.
    expect(btn.dataset['action']).toBe('row-menu');
    expect(btn.dataset['resourceId']).toBe('alice');
  });

  it('keeps the grid to one Tab stop', async () => {
    const el = await mount(ALL);

    for (const btn of el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-row-menu-button')) {
      expect(btn.tabIndex).toBe(-1);
    }
  });

  it('paints the row colour with a readable glyph on top', async () => {
    const el = await mount(ALL);
    const btn = trigger(el, 'alice')!;

    // A group's colour was stored and editable but painted nowhere in this
    // column; the trigger doubles as the chip.
    expect(btn.style.background).not.toBe('');
    expect(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']).toContain(btn.style.color);
  });
});

describe('mp-scheduler — reaching the panel without a mouse (M7)', () => {
  function firstSlot(el: MpScheduler, resourceId: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(
      `.scheduler-timeline-slot[data-resource-id="${resourceId}"]`,
    )!;
  }

  function key(el: MpScheduler, k: string, target?: HTMLElement): void {
    (target ?? el).dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }),
    );
  }

  it('ArrowLeft from the first slot in a row moves focus onto the trigger', async () => {
    const el = await mount(ALL);
    const slot = firstSlot(el, 'alice');
    slot.focus();
    // Land on the first slot of the visible window, then try to go further.
    key(el, 'Home');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    key(el, 'ArrowLeft');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(el.shadowRoot!.activeElement).toBe(trigger(el, 'alice'));
  });

  it('Enter on the trigger opens the panel', async () => {
    const el = await mount(ALL);
    const btn = trigger(el, 'alice')!;
    btn.focus();
    key(el, 'Enter', btn);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).not.toBeNull();
  });

  it('ArrowRight hands focus back to the grid', async () => {
    const el = await mount(ALL);
    const slot = firstSlot(el, 'alice');
    slot.focus();
    key(el, 'Home');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    key(el, 'ArrowLeft');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    const btn = trigger(el, 'alice')!;
    key(el, 'ArrowRight', btn);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(el.shadowRoot!.activeElement).not.toBe(btn);
  });

  it('Escape closes the panel and returns focus to the trigger', async () => {
    const el = await mount(ALL);
    await open(el, 'alice');
    key(el, 'Escape');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).toBeNull();
    expect(trigger(el, 'alice')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('a contextmenu on the resource cell opens the panel for that row', async () => {
    const el = await mount(ALL);
    const cell = el.shadowRoot!.querySelectorAll('.scheduler-resource-cell')[1] as HTMLElement;

    const ev = new PointerEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerType: 'mouse',
      button: 2,
    });
    cell.dispatchEvent(ev);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Right-click a row for its actions: what a desktop user tries first.
    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).not.toBeNull();
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe('mp-scheduler — a non-modal panel does not swallow the grid (audit M12)', () => {
  it('leaves grid arrow keys working while the panel is open', async () => {
    const el = await mount(ALL);
    const slot = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[data-resource-id="alice"]',
    )!;
    slot.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const moved = (el as unknown as { stateManager: { getState(): { focusedCell: { start: Date } | null } } })
      .stateManager.getState().focusedCell?.start.getTime();

    await open(el, 'alice');
    // Focus is back in the grid while the panel stays open — exactly what a
    // NON-modal dialog invites. Every key used to be swallowed here.
    slot.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    const movedAgain = (el as unknown as { stateManager: { getState(): { focusedCell: { start: Date } | null } } })
      .stateManager.getState().focusedCell?.start.getTime();

    expect(movedAgain).toBeGreaterThan(moved!);
  });
});

describe('mp-scheduler — a rebuild keeps the user where they were (R10)', () => {
  /**
   * Emptying `.scheduler-content` collapses its scrollWidth, so the browser
   * clamps scrollLeft to 0. Any change to `resources` triggers a full render —
   * which is every request the row panel emits — so applying a rename used to
   * throw the user ~17,000px back to Monday 00:00.
   *
   * jsdom does not lay out, so scrollLeft is not clamped for us here; these
   * assert the capture/restore contract instead. The clamp itself was verified
   * in Chromium against the built demo.
   */
  function scroller(el: MpScheduler): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
  }

  it('restores the scroll offset after a resource change rebuilds the view', async () => {
    const el = await mount(ALL);
    const content = scroller(el);
    content.scrollLeft = 2400;
    content.scrollTop = 120;

    (el as unknown as { resources: unknown[] }).resources = [...RESOURCES];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(content.scrollLeft).toBe(2400);
    expect(content.scrollTop).toBe(120);
  });

  it('lands at the top-left on a real view switch', async () => {
    const el = await mount(ALL);
    const content = scroller(el);
    content.scrollLeft = 2400;

    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // Carrying a timeline offset into another view would be its own bug.
    expect(content.scrollLeft).toBe(0);
  });

  it('does not fight a scroll the user makes while a rebuild is pending', async () => {
    const el = await mount(ALL);
    const content = scroller(el);
    content.scrollLeft = 2400;

    // Two rebuilds in one frame: the second must not capture the 0 the first
    // caused, and the restore must still target the user's real position.
    (el as unknown as { resources: unknown[] }).resources = [...RESOURCES];
    (el as unknown as { resources: unknown[] }).resources = [...RESOURCES];
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(content.scrollLeft).toBe(2400);
  });
});

describe('mp-scheduler — the panel re-targets to the row you clicked (R13)', () => {
  /**
   * OverlayController.open() is a no-op while already open, and the anchor is
   * resolved lazily by id — so changing the id repainted the panel's CONTENTS
   * for the new row while leaving it positioned under the previous row's
   * trigger. The outside-mousedown dismissal could not break the tie either: it
   * ignores any press whose composed path includes the host, and every trigger
   * is inside the host.
   *
   * Position itself is browser-only (jsdom does not lay out), so these assert
   * the state that drives it: which row the panel belongs to, and which single
   * trigger claims aria-expanded.
   */
  function expanded(el: MpScheduler): (string | undefined)[] {
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-row-menu-button')]
      .filter((b) => b.getAttribute('aria-expanded') === 'true')
      .map((b) => b.dataset['resourceId']);
  }

  it('re-anchors to the second row rather than staying on the first', async () => {
    const el = await mount(ALL);

    await open(el, 'team');
    expect(expanded(el)).toEqual(['team']);

    await open(el, 'alice');
    const panel = el.shadowRoot!.querySelector('.scheduler-row-panel')!;
    expect(panel.getAttribute('aria-label')).toBe('Actions for Alice');
    // Exactly one trigger may claim the panel, and it must be the new one.
    expect(expanded(el)).toEqual(['alice']);
  });

  it('closes when the open row is clicked again', async () => {
    const el = await mount(ALL);

    await open(el, 'alice');
    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).not.toBeNull();

    trigger(el, 'alice')!.click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // A disclosure control toggles — which is what aria-expanded on it promises.
    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).toBeNull();
    expect(expanded(el)).toEqual([]);
  });

  it('never leaves two triggers claiming to be expanded', async () => {
    const el = await mount(ALL);

    for (const id of ['team', 'alice', 'team', 'alice']) {
      await open(el, id);
      expect(expanded(el).length, `after opening ${id}`).toBe(1);
    }
  });
});

describe('mp-scheduler — Rename lives in the panel (R14)', () => {
  it('offers Rename on both a group and a resource', async () => {
    const el = await mount(ALL);

    const group = await open(el, 'team');
    expect(group.querySelector('[data-action="rename-resource"]')!.textContent!.trim()).toBe(
      'Rename Team',
    );

    const resource = await open(el, 'alice');
    expect(resource.querySelector('[data-action="rename-resource"]')!.textContent!.trim()).toBe(
      'Rename Alice',
    );
  });

  it('starts the inline edit and puts the caret in it', async () => {
    const el = await mount(ALL);
    const panel = await open(el, 'alice');

    panel.querySelector<HTMLElement>('[data-action="rename-resource"]')!.click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.rename-input');
    expect(input).not.toBeNull();
    // The panel gets out of the way, and focus goes to the input rather than
    // back to the trigger — no detour on the way to typing.
    expect(el.shadowRoot!.querySelector('.scheduler-row-panel')).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(input);
  });

  it('emits resource-update with the new title on Enter', async () => {
    const el = await mount(ALL);
    const seen: Record<string, string>[] = [];
    el.addEventListener('resource-update', (e) =>
      seen.push((e as CustomEvent).detail.changes as Record<string, string>),
    );

    const panel = await open(el, 'alice');
    panel.querySelector<HTMLElement>('[data-action="rename-resource"]')!.click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.rename-input')!;
    input.value = 'Alice Cooper';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(seen).toEqual([{ title: 'Alice Cooper' }]);
  });

  it('is absent without updateResource, like every other entry', async () => {
    const el = await mount({ deleteResource: true });
    const panel = await open(el, 'alice');

    expect(panel.querySelector('[data-action="rename-resource"]')).toBeNull();
    expect(panel.querySelector('[data-action="delete-resource"]')).not.toBeNull();
  });
});
