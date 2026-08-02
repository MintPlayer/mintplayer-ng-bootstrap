import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

/**
 * R9 — the touch `contextmenu` regression.
 *
 * What these specs can and cannot cover, established by measurement (PRD §14.3):
 * the browser's long-press gesture is UNREACHABLE from CDP — `dispatchTouchEvent`
 * with a 1500ms hold, the same with jitter, and `synthesizeTapGesture` all failed
 * to make Chromium emit a `contextmenu`. So no automated test anywhere in this
 * repo can assert "a long-press drags instead of opening the editor" end to end.
 *
 * What IS reachable is the handler's *decision*, and that is what these assert.
 * The three event shapes below were verified in a real browser to round-trip
 * exactly as constructed, including the bare `MouseEvent` whose `pointerType` is
 * absent — the Firefox/WebKit shape, and the case that must consult tracked state.
 *
 * The gesture itself is verified on hardware; see the plan's M0 device step.
 */

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  (el as unknown as { resources: unknown[] }).resources = [
    {
      id: 'alice',
      title: 'Alice',
      events: [
        {
          id: 'standup',
          title: 'Standup',
          start: new Date(2026, 4, 11, 9, 0),
          end: new Date(2026, 4, 11, 9, 30),
          resourceId: 'alice',
        },
      ],
    },
  ];
  (el as unknown as { date: Date }).date = new Date(2026, 4, 11);
  el.setAttribute('view', 'timeline');
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

function eventEl(el: MpScheduler): HTMLElement {
  const node = el.shadowRoot!.querySelector<HTMLElement>('[data-event-id="standup"]');
  if (!node) throw new Error('event element not rendered');
  return node;
}

function editorOpen(el: MpScheduler): boolean {
  return !!el.shadowRoot!.querySelector('.scheduler-event-editor');
}

/** A `contextmenu` carrying `pointerType` — the Chromium shape. */
function pointerContextMenu(pointerType: 'mouse' | 'touch' | 'pen'): PointerEvent {
  return new PointerEvent('contextmenu', {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerType,
    button: 2,
  });
}

/** A `contextmenu` with NO `pointerType` — the Firefox / WebKit shape. */
function mouseContextMenu(): MouseEvent {
  return new MouseEvent('contextmenu', {
    bubbles: true,
    composed: true,
    cancelable: true,
    button: 2,
  });
}

afterEach(() => {
  document.querySelectorAll('mp-scheduler').forEach((n) => n.remove());
});

describe('mp-scheduler — contextmenu is arbitrated by input device (R9)', () => {
  it('opens the editor for a mouse-originated contextmenu', async () => {
    const el = await mount();
    eventEl(el).dispatchEvent(pointerContextMenu('mouse'));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(editorOpen(el)).toBe(true);
  });

  it('does NOT open the editor for a touch-originated contextmenu', async () => {
    const el = await mount();
    eventEl(el).dispatchEvent(pointerContextMenu('touch'));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    // This is the whole regression: the browser's long-press used to land here
    // ~100ms before the 600ms hold armed, so the drag was never reachable.
    expect(editorOpen(el)).toBe(false);
  });

  it('consumes the touch contextmenu so the platform menu cannot cover an arming drag', async () => {
    const el = await mount();
    const ev = pointerContextMenu('touch');
    eventEl(el).dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('treats a pen like a mouse — a stylus drives the mouse path, not the hold', async () => {
    const el = await mount();
    eventEl(el).dispatchEvent(pointerContextMenu('pen'));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(editorOpen(el)).toBe(true);
  });

  it('falls back to the tracked device when contextmenu carries no pointerType', async () => {
    const el = await mount();
    // Firefox / WebKit shape. Nothing has touched the scheduler yet, so the
    // tracked device is the default 'mouse' and the editor must open.
    eventEl(el).dispatchEvent(mouseContextMenu());
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(editorOpen(el)).toBe(true);
  });

  it('falls back to touch after a touchstart, even with no pointerType on the event', async () => {
    const el = await mount();
    const target = eventEl(el);
    // Drive the real listener so InputHandler records the device, exactly as a
    // finger would. Poking a private field would assert nothing about the wiring.
    const touch = {
      identifier: 1,
      target,
      clientX: 10,
      clientY: 10,
      pageX: 10,
      pageY: 10,
      screenX: 10,
      screenY: 10,
    } as unknown as Touch;
    target.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        composed: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
      }),
    );

    target.dispatchEvent(mouseContextMenu());
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(editorOpen(el)).toBe(false);
  });
});

describe('mp-scheduler — text entry keeps the platform menu (R9)', () => {
  it('leaves contextmenu alone inside the editor’s title input, on touch', async () => {
    const el = await mount();
    // Open the editor by the mouse path first.
    eventEl(el).dispatchEvent(pointerContextMenu('mouse'));
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLElement>('.editor-title-input');
    expect(input, 'editor title input should be rendered').toBeTruthy();

    const ev = pointerContextMenu('touch');
    input!.dispatchEvent(ev);
    // Long-press-to-paste belongs to the user. We must not consume it.
    expect(ev.defaultPrevented).toBe(false);
  });
});
