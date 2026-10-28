import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';
import {
  nextRaf,
  mount,
  dispatchKey,
  useFakeAnimationFrames,
} from '../../testing/scheduler-spec-fixture';

/**
 * The built-in event editor, resource column resize + rename, and the editor surviving a re-render.
 *
 * One of four files split out of the original mp-scheduler.keyboard.spec.ts so
 * vitest can run them in parallel; the fixture is shared in
 * scheduler/testing/scheduler-spec-fixture.ts.
 */
useFakeAnimationFrames();

/**
 * A user's pick in an `<mp-datetime-picker>`: the picker reports it as
 * `valuechange`, and the scheduler only ever reads it from there.
 */
const pick = (picker: HTMLElement, value: Date | null) =>
  picker.dispatchEvent(new CustomEvent('valuechange', { detail: value }));

/**
 * M23 (R20) — the built-in event editor: a popover anchored to the event,
 * emitting the SAME requests every other surface emits (Save = event-update,
 * Delete = event-delete). §8.4 non-goal 3 reversed by user decision.
 */
describe('mp-scheduler — built-in event editor (M23)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  /** The scheduler's own live region — each editor picker renders one too. */
  const announcement = () =>
    [...el.shadowRoot!.querySelectorAll('[role="status"]')].find((r) => !r.closest('mp-datetime-picker'))
      ?.textContent;

  const EV = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountWeek = async (props: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'week');
    await settle();
    return el;
  };

  const editor = () => el.shadowRoot!.querySelector('.scheduler-event-editor');

  const openViaF2 = async () => {
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();
  };

  it('F2 on the selected event opens the editor; Escape closes and returns focus', async () => {
    await mountWeek();
    await openViaF2();
    expect(editor()).not.toBeNull();
    expect(editor()!.getAttribute('role')).toBe('dialog');
    expect(editor()!.getAttribute('aria-label')).toBe('Edit Task');
    // Focus lands on the first enabled input, not a button.
    expect((el.shadowRoot!.activeElement as HTMLElement)?.classList.contains('editor-input')).toBe(true);
    dispatchKey(el, 'Escape');
    await settle();
    expect(editor()).toBeNull();
    expect(
      (el.shadowRoot!.activeElement as HTMLElement)?.classList.contains('scheduler-event'),
    ).toBe(true);
  });

  it('right-click on an event opens the editor and suppresses the native menu', async () => {
    await mountWeek();
    const eventEl = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!;
    const ctx = new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true });
    eventEl.dispatchEvent(ctx);
    await settle();
    expect(ctx.defaultPrevented).toBe(true);
    expect(editor()).not.toBeNull();
  });

  it('Save emits event-update carrying the edited fields', async () => {
    await mountWeek();
    await openViaF2();
    const title = editor()!.querySelector<HTMLInputElement>('.editor-title-input')!;
    title.value = 'Renamed';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    // <mp-datetime-picker>: `value` is a Date, so no string round-trip.
    const end = editor()!.querySelector<HTMLElement & {
      value: Date | null;
    }>('mp-datetime-picker.editor-end-input')!;
    pick(end, new Date(2026, 4, 12, 11, 30));
    await settle();
    let detail: { event: { title: string; end: Date }; oldEvent: { title: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.event.title).toBe('Renamed');
    expect(detail!.event.end.getHours()).toBe(11);
    expect(detail!.event.end.getMinutes()).toBe(30);
    expect(detail!.oldEvent.title).toBe('Task');
    expect(editor()).toBeNull();
  });

  /**
   * D12.12 — the guard that used to catch this now cannot be reached from the
   * pickers, because the end CLAMPS instead of inverting. It survives as the
   * backstop for a range the UI cannot construct, so it is driven through the
   * draft directly: consumer-supplied data is the only remaining way in.
   */
  it('Save refuses a range the pickers cannot produce, with an inline error and no emit', async () => {
    await mountWeek();
    await openViaF2();
    (el as unknown as { editorDraft: { end: Date } }).editorDraft.end = new Date(2026, 4, 12, 8, 0);
    let emitted = false;
    el.addEventListener('event-update', () => {
      emitted = true;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(emitted).toBe(false);
    expect(editor()).not.toBeNull();
    // The message lives on the END picker, as its `error-text` — an IDREF
    // cannot cross into that shadow root (D12.14).
    const endPicker = editor()!.querySelector<HTMLElement & {
      invalid: boolean;
      errorText: string | null;
    }>('mp-datetime-picker.editor-end-input')!;
    expect(endPicker.invalid).toBe(true);
    expect(endPicker.errorText).toContain('End must be after start');
  });

  /**
   * D12.14 — a refused Save says why exactly once: through the offending
   * control's own description, delivered by moving focus there. Not through a
   * live region as well, which would speak it twice, and which self-clears so
   * it cannot hold something the user may want to re-read.
   */
  describe('a refused Save speaks once, on the offending field (D12.14)', () => {
    const save = () =>
      (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();

    it('an emptied title marks the title input and moves focus to it', async () => {
      await mountWeek();
      await openViaF2();
      const title = editor()!.querySelector<HTMLInputElement>('.editor-title-input')!;
      title.value = '   ';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();

      save();
      await settle();

      expect(title.getAttribute('aria-invalid')).toBe('true');
      const message = editor()!.querySelector('.editor-title-input + .invalid-feedback')!;
      expect(message.textContent).toContain('Title is required');
      // Described by the very node that carries the message, so focus speaks it.
      expect(title.getAttribute('aria-errormessage')).toBe(message.id);
      expect(title.getAttribute('aria-describedby')).toBe(message.id);
      expect(el.shadowRoot!.activeElement).toBe(title);
    });

    it('the message goes to ONE channel — the live region never repeats it', async () => {
      await mountWeek();
      await openViaF2();
      const title = editor()!.querySelector<HTMLInputElement>('.editor-title-input')!;
      title.value = '';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();

      save();
      await settle();

      expect(announcement()).not.toContain(
        'Title is required',
      );
      // And exactly one message node exists, not one per field.
      expect(editor()!.querySelectorAll('.invalid-feedback').length).toBe(1);
    });

    it('editing the offending field clears its message; editing another does not', async () => {
      await mountWeek();
      await openViaF2();
      const title = editor()!.querySelector<HTMLInputElement>('.editor-title-input')!;
      title.value = '';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
      save();
      await settle();
      expect(editor()!.querySelectorAll('.invalid-feedback').length).toBe(1);

      // Touching the END leaves the still-empty title marked.
      pick(editor()!.querySelector<HTMLElement>('mp-datetime-picker.editor-end-input')!, new Date(2026, 4, 12, 11, 0));
      await settle();
      expect(editor()!.querySelectorAll('.invalid-feedback').length).toBe(1);

      // Fixing the title itself clears it.
      title.value = 'Named';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
      expect(editor()!.querySelectorAll('.invalid-feedback').length).toBe(0);
      expect(title.getAttribute('aria-invalid')).toBe('false');
    });

    it('a refused range moves focus into the END picker, not onto Save', async () => {
      await mountWeek();
      await openViaF2();
      (el as unknown as { editorDraft: { end: Date } }).editorDraft.end = new Date(2026, 4, 12, 8, 0);

      save();
      await settle();

      const endPicker = editor()!.querySelector<HTMLElement>('mp-datetime-picker.editor-end-input')!;
      // Focus lands on the picker's field — the node carrying the name, the
      // invalid state and the description.
      expect(el.shadowRoot!.activeElement).toBe(endPicker.querySelector('input.form-control'));
    });
  });

  it('the Delete button emits event-delete and closes', async () => {
    await mountWeek();
    await openViaF2();
    let deleted: string | null = null;
    el.addEventListener('event-delete', (e) => {
      deleted = (e as CustomEvent).detail.event.id;
    });
    (editor()!.querySelector('.editor-action.danger') as HTMLElement).click();
    await settle();
    expect(deleted).toBe('task');
    expect(editor()).toBeNull();
  });

  it('fields follow the permission table; a disabled field is never read back', async () => {
    await mountWeek({
      options: { permissions: { moveEvent: false, resizeEvent: false } },
    });
    await openViaF2();
    // Title stays editable (editEvent default true); time fields are locked.
    expect(editor()!.querySelector<HTMLInputElement>('.editor-title-input')!.disabled).toBe(false);
    const picker = (cls: string) =>
      editor()!.querySelector<HTMLElement & { value: Date | null; disabled: boolean }>(
        `mp-datetime-picker.${cls}`,
      )!;
    expect(picker('editor-start-input').disabled).toBe(true);
    expect(picker('editor-end-input').disabled).toBe(true);
    // Even a forced value on a disabled input must not survive Save.
    picker('editor-end-input').value = new Date(2026, 4, 12, 15, 0);
    let detail: { event: { end: Date } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.event.end.getTime()).toBe(EV.end.getTime());
  });

  /**
   * D12.13's matrix — which time fields are live, and what a START change
   * means, for each combination of the two remaining capabilities. The row
   * that matters most is `moveEvent: true, resizeEvent: false`: the editor
   * used to commit a pure duration change there, which `resizable: false`
   * forbids everywhere else.
   */
  describe('the editor time fields follow move vs resize (D12.13)', () => {
    const picker = (cls: string) =>
      editor()!.querySelector<HTMLElement & {
        value: Date | null;
        disabled: boolean;
      }>(`mp-datetime-picker.${cls}`)!;

    const openWith = async (permissions: Record<string, unknown>) => {
      await mountWeek({ options: { permissions } });
      await openViaF2();
    };

    it('move + resize: both fields live, a start change moves', async () => {
      await openWith({ moveEvent: true, resizeEvent: true });
      expect(picker('editor-start-input').disabled).toBe(false);
      expect(picker('editor-end-input').disabled).toBe(false);

      pick(picker('editor-start-input'), new Date(2026, 4, 12, 11, 0));
      await settle();
      // Duration preserved — the end followed.
      expect(picker('editor-end-input').value!.getTime()).toBe(
        new Date(2026, 4, 12, 12, 0).getTime(),
      );
    });

    it('move only: the END field is locked, but a start change still moves both', async () => {
      await openWith({ moveEvent: true, resizeEvent: false });
      expect(picker('editor-start-input').disabled).toBe(false);
      // Editing the end ALONE is a resize, which is denied.
      expect(picker('editor-end-input').disabled).toBe(true);

      pick(picker('editor-start-input'), new Date(2026, 4, 12, 11, 0));
      await settle();

      let detail: { event: { start: Date; end: Date } } | null = null;
      el.addEventListener('event-update', (e) => {
        detail = (e as CustomEvent).detail;
      });
      (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
      await settle();

      // Both edges commit — it is a move, and the duration is unchanged.
      expect(detail!.event.start.getTime()).toBe(new Date(2026, 4, 12, 11, 0).getTime());
      expect(detail!.event.end.getTime()).toBe(new Date(2026, 4, 12, 12, 0).getTime());
    });

    it('resize only: a start change resizes the start alone, clamped and announced', async () => {
      await openWith({ moveEvent: false, resizeEvent: true });
      expect(picker('editor-start-input').disabled).toBe(false);
      expect(picker('editor-end-input').disabled).toBe(false);

      // Well inside the range: the end holds still.
      pick(picker('editor-start-input'), new Date(2026, 4, 12, 9, 15));
      await settle();
      expect(picker('editor-end-input').value!.getTime()).toBe(
        new Date(2026, 4, 12, 10, 0).getTime(),
      );

      // Past the end: clamped to one slot before it, and said out loud.
      pick(picker('editor-start-input'), new Date(2026, 4, 12, 12, 0));
      await settle();
      expect(picker('editor-start-input').value!.getTime()).toBe(
        new Date(2026, 4, 12, 9, 30).getTime(),
      );
      expect(announcement()).toContain(
        'Start adjusted to',
      );
    });

    it('a per-item edge lock disables BOTH editor fields, and the handle still works', async () => {
      await mountWeek({ events: [{ ...EV, resizable: { start: false, end: true } }] });
      await openViaF2();
      // The editor commits a RANGE, so it cannot offer half of one (B35).
      expect(picker('editor-start-input').disabled).toBe(false); // moveEvent still on
      expect(picker('editor-end-input').disabled).toBe(true);
      // The end handle is a different question, and still answered yes.
      expect(
        el.shadowRoot!.querySelector('.scheduler-event .resize-handle.bottom'),
      ).not.toBeNull();
      expect(el.shadowRoot!.querySelector('.scheduler-event .resize-handle.top')).toBeNull();
    });
  });

  /**
   * Colour is two-state (`color` absent = inherit from the resource) and the
   * CHECKBOX owns which state, not the swatch's value. Reading the swatch
   * unconditionally used to convert every inheriting event into an explicitly
   * coloured one on the first Save — it is seeded with the RESOLVED colour, so
   * the conversion was invisible until the resource was recoloured or the event
   * was dragged to another row, where it kept the old colour.
   */
  it('Save on an inheriting event does not pin a colour; unchecking inherit does', async () => {
    await mountWeek({ resources: [{ id: 'alice', title: 'Alice', color: '#fd7e14' }] });
    (el as unknown as { events: unknown[] }).events = [{ ...EV, resourceId: 'alice' }];
    await settle();
    await openViaF2();

    // Inheriting: checked, and the swatch is disabled so there is no gesture
    // that can silently commit the inherited value.
    // An <mp-checkbox>, not a native input — Bootstrap's form styles do not
    // cross a shadow boundary, so the WC brings its own. `checked` is a host
    // property, so it reads and writes like the native one.
    const inherit = () =>
      editor()!.querySelector<HTMLElement & { checked: boolean }>('mp-checkbox.editor-inherit-input')!;
    const swatch = () => editor()!.querySelector<HTMLInputElement>('.editor-color-input')!;
    expect(inherit().checked).toBe(true);
    expect(swatch().disabled).toBe(true);
    // It still SHOWS what it inherits.
    expect(swatch().value).toBe('#fd7e14');

    let detail: { event: { color?: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect('color' in detail!.event).toBe(false);

    // Unchecking enables the swatch and pins whatever it holds.
    await openViaF2();
    inherit().checked = false;
    inherit().dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    expect(swatch().disabled).toBe(false);
    swatch().value = '#123456';
    swatch().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    detail = null;
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect(detail!.event.color).toBe('#123456');

    // And re-checking it on an explicitly-coloured event CLEARS the override —
    // the checkbox is the reset, which a colour input alone cannot express.
    await openViaF2();
    expect(inherit().checked).toBe(false);
    inherit().checked = true;
    inherit().dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    detail = null;
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();
    expect('color' in detail!.event).toBe(false);
  });

  /**
   * The editor CONTAINS popovers (each <mp-datetime-picker> has a grid and a
   * list). The browser closes an open one on Escape, but the scheduler's
   * handler runs first — without stepping aside it would close the whole
   * editor, and the user's unsaved edits with it, when they meant to dismiss a
   * calendar.
   */
  it('Escape aimed at an open picker popover leaves the editor open', async () => {
    await mountWeek();
    await openViaF2();
    const picker = editor()!.querySelector<HTMLElement>('mp-datetime-picker.editor-start-input')!;
    const popup = picker.querySelector<HTMLElement>('.datetime-picker-popup-date')!;
    // jsdom has no popover API: stand in for the browser's open state.
    const matches = popup.matches.bind(popup);
    popup.matches = (selector: string) => selector === ':popover-open' || matches(selector);

    // First Escape: the calendar owns it — the editor must survive.
    dispatchKey(el, 'Escape');
    await settle();
    expect(editor()).not.toBeNull();

    // Second Escape: the browser closed the popover, so the editor closes.
    popup.matches = matches;
    dispatchKey(el, 'Escape');
    await settle();
    expect(editor()).toBeNull();
  });

  /**
   * B30 — reported as "I pick another start/end, but the timestamps aren't
   * updated". Moving the START past the untouched end tripped the
   * `end <= start` guard, so Save refused and nothing moved. Every other path
   * that changes a start preserves duration (pointer move-drag, keyboard
   * move-mode); the editor now does too.
   */
  it('moving the start shifts the end with it, preserving duration (D12.10)', async () => {
    await mountWeek();
    await openViaF2();
    const picker = (cls: string) =>
      editor()!.querySelector<HTMLElement & {
        value: Date | null;
      }>(`mp-datetime-picker.${cls}`)!;

    // The user picks a start two days later.
    pick(picker('editor-start-input'), new Date(2026, 4, 14, 9, 0));
    await settle();

    // The end followed, LIVE and visibly, keeping the original 1h duration.
    expect(picker('editor-end-input').value!.getTime()).toBe(
      new Date(2026, 4, 14, 10, 0).getTime(),
    );

    let detail: { event: { start: Date; end: Date } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (editor()!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();

    // And Save commits it instead of refusing.
    expect(detail).not.toBeNull();
    expect(detail!.event.start.getTime()).toBe(new Date(2026, 4, 14, 9, 0).getTime());
    expect(detail!.event.end.getTime()).toBe(new Date(2026, 4, 14, 10, 0).getTime());
    expect(editor()).toBeNull();
  });

  it('changing only the END is a resize — the start never follows', async () => {
    await mountWeek();
    await openViaF2();
    const picker = (cls: string) =>
      editor()!.querySelector<HTMLElement & {
        value: Date | null;
      }>(`mp-datetime-picker.${cls}`)!;

    pick(picker('editor-end-input'), new Date(2026, 4, 12, 12, 0));
    await settle();
    expect(picker('editor-start-input').value!.getTime()).toBe(
      new Date(2026, 4, 12, 9, 0).getTime(),
    );
    expect(picker('editor-end-input').value!.getTime()).toBe(
      new Date(2026, 4, 12, 12, 0).getTime(),
    );
  });

  /**
   * R21 / D12.12 — the end is the only edge that can invert a draft (a start
   * change preserves duration, so it cannot). Same DAY is the case no picker
   * bound can express, since the start's own day must stay fully selectable.
   */
  describe('the end cannot be pulled before the start (D12.12)', () => {
    const picker = (cls: string) =>
      editor()!.querySelector<HTMLElement & {
        value: Date | null;
        min: Date | null;
        max: Date | null;
      }>(`mp-datetime-picker.${cls}`)!;

    it('an earlier time on the same day clamps to one slot, and says so', async () => {
      await mountWeek();
      await openViaF2();

      pick(picker('editor-end-input'), new Date(2026, 4, 12, 8, 0));
      await settle();

      // One 30-minute slot after the 09:00 start — the floor keyboard resize
      // uses, not the 1-minute event a raw pick would have committed.
      expect(picker('editor-end-input').value!.getTime()).toBe(
        new Date(2026, 4, 12, 9, 30).getTime(),
      );
      expect(picker('editor-start-input').value!.getTime()).toBe(
        new Date(2026, 4, 12, 9, 0).getTime(),
      );
      expect(announcement()).toContain(
        'End adjusted to',
      );
    });

    it('a valid pick is left exactly where the user put it, and announces nothing', async () => {
      await mountWeek();
      await openViaF2();

      pick(picker('editor-end-input'), new Date(2026, 4, 14, 8, 0)); // a LATER day
      await settle();

      expect(picker('editor-end-input').value!.getTime()).toBe(
        new Date(2026, 4, 14, 8, 0).getTime(),
      );
      expect(announcement()).not.toContain(
        'End adjusted to',
      );
    });

    it('the end picker is bounded by the start; the start picker is bounded by nothing', async () => {
      await mountWeek();
      await openViaF2();

      // Date-granular in the calendar, so an earlier DAY is unpickable while
      // the start's own day stays open — the clamp above covers the rest.
      expect(picker('editor-end-input').min!.getTime()).toBe(
        new Date(2026, 4, 12, 9, 0).getTime(),
      );
      // F1: a start change shifts the end with it, so it can never invert.
      expect(picker('editor-start-input').max).toBeNull();
    });

    it('the bound follows the start as it moves', async () => {
      await mountWeek();
      await openViaF2();

      pick(picker('editor-start-input'), new Date(2026, 4, 14, 9, 0));
      await settle();

      expect(picker('editor-end-input').min!.getTime()).toBe(
        new Date(2026, 4, 14, 9, 0).getTime(),
      );
    });
  });

  it('eventEditor=false disables every opener while event-dblclick keeps firing', async () => {
    await mountWeek({ eventEditor: false });
    expect(el.getAttribute('event-editor')).toBe('false');
    await openViaF2();
    expect(editor()).toBeNull();
    // The dblclick contract survives for app-owned editors.
    let dbl = false;
    el.addEventListener('event-dblclick', () => {
      dbl = true;
    });
    const internals = el as unknown as {
      registerEventActivation: (ev: unknown, oe: Event) => void;
    };
    internals.registerEventActivation(EV, new MouseEvent('click'));
    internals.registerEventActivation(EV, new MouseEvent('click'));
    await settle();
    expect(dbl).toBe(true);
    expect(editor()).toBeNull();
  });

  it('readonly kills the editor wholesale', async () => {
    await mountWeek({ readonly: true });
    await openViaF2();
    expect(editor()).toBeNull();
  });
});

/**
 * M24 (R15–R17) — the resource column: resize separator, full-text tooltips,
 * inline rename. Real geometry belongs to the browser tests; these pin the
 * structure, gating and the request contract.
 */
describe('mp-scheduler — resource column resize + rename (M24)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountTimeline = async (props: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'team', title: 'A very long team name that ellipsises', children: [
        { id: 'alice', title: 'Alice' },
      ] },
    ];
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'timeline');
    await settle();
    return el;
  };

  it('renders a window-splitter separator that writes the column width variable', async () => {
    await mountTimeline();
    const resizer = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-column-resizer')!;
    expect(resizer).not.toBeNull();
    expect(resizer.getAttribute('role')).toBe('separator');
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical');
    expect(resizer.getAttribute('aria-label')).toBe('Resize the resource column');
    expect(resizer.getAttribute('aria-valuenow')).not.toBeNull();

    resizer.focus();
    resizer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    const container = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    const written = container.style.getPropertyValue('--scheduler-resource-column-width');
    // Clamped and guarded: a px value wrapped in the calc(100% - 50px) cap.
    expect(written).toContain('px');
    expect(written).toContain('calc(100% - 50px)');
  });

  it('every resource/group title carries its full text as a tooltip (R16)', async () => {
    await mountTimeline();
    const titles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.resource-title')];
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(titles.every((t) => t.title === t.textContent)).toBe(true);
  });

  it('double-click renames via a resource-update request; Escape cancels (R17)', async () => {
    await mountTimeline({ options: { permissions: { updateResource: true } } });
    const title = el.shadowRoot!.querySelector<HTMLElement>(
      '.resource-title[data-resource-id="alice"]',
    )!;
    expect(title).not.toBeNull();

    // Escape path first: no emit, original text restored.
    title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    let input = title.querySelector('input')!;
    expect(input).not.toBeNull();
    input.value = 'Bob';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(title.textContent).toBe('Alice');

    // Enter path: the request carries only the changed field.
    let detail: { resource: { id: string }; changes: { title?: string } } | null = null;
    el.addEventListener('resource-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    input = title.querySelector('input')!;
    input.value = 'Alicia';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(detail).not.toBeNull();
    expect(detail!.resource.id).toBe('alice');
    expect(detail!.changes).toEqual({ title: 'Alicia' });
    expect(title.textContent).toBe('Alicia');
  });

  it('rename is absent without updateResource, and F2 on a timeline cell starts it with', async () => {
    await mountTimeline();
    // Default permissions: no data-resource-id handle at all.
    expect(
      el.shadowRoot!.querySelector('.resource-title[data-resource-id]'),
    ).toBeNull();
    el.remove();

    await mountTimeline({ options: { permissions: { updateResource: true } } });
    const slot = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[data-resource-id="alice"]',
    )!;
    slot.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();
    const title = el.shadowRoot!.querySelector<HTMLElement>(
      '.resource-title[data-resource-id="alice"]',
    )!;
    expect(title.querySelector('input')).not.toBeNull();
    expect(el.shadowRoot!.activeElement?.classList.contains('rename-input')).toBe(true);
  });
});

/**
 * B31 — the editor lost the user's edit when the panel re-rendered.
 *
 * The controls are Lit bindings; the scheduler re-renders on ANY state change,
 * including the one a mousedown on Save provokes. With the bindings fed from
 * the stored event and Save scraping the DOM, the controls were reset to the
 * stored values between mousedown and click, and Save committed those. Found
 * in a browser — a programmatic `.click()` never fires the mousedown, which is
 * why the earlier DOM-poking specs all passed.
 */
describe('mp-scheduler — the editor survives a re-render (B31)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EV = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('an edit survives an unrelated state change, and Save commits the EDIT', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    el.setAttribute('view', 'week');
    await settle();

    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();

    const startPicker = () =>
      el.shadowRoot!.querySelector<HTMLElement & {
        value: Date | null;
      }>('mp-datetime-picker.editor-start-input')!;

    // The user moves the event two days later.
    pick(startPicker(), new Date(2026, 4, 14, 9, 0));
    await settle();
    expect(startPicker().value!.getTime()).toBe(new Date(2026, 4, 14, 9, 0).getTime());

    // Now force the kind of state change a mousedown provokes. Before the fix
    // this re-render reset the control to the STORED start (May 12).
    (el as unknown as { stateManager: { setState: (u: Record<string, unknown>) => void } })
      .stateManager.setState({ selectedEvent: null });
    await settle();
    expect(startPicker().value!.getTime()).toBe(new Date(2026, 4, 14, 9, 0).getTime());

    let detail: { event: { start: Date; end: Date } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (el.shadowRoot!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();

    // And the COMMIT carries the edit, not the pre-render value.
    expect(detail).not.toBeNull();
    expect(detail!.event.start.getTime()).toBe(new Date(2026, 4, 14, 9, 0).getTime());
    expect(detail!.event.end.getTime()).toBe(new Date(2026, 4, 14, 10, 0).getTime());
  });

  // B32 — the selection held an event OBJECT, so it kept a pre-edit copy after
  // any commit; F2 then reopened the editor on stale values.
  it('the selection tracks the committed record, so reopening shows the edit', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    el.setAttribute('view', 'week');
    await settle();

    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();

    const title = el.shadowRoot!.querySelector<HTMLInputElement>('.editor-title-input')!;
    title.value = 'Renamed';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    (el.shadowRoot!.querySelector('.editor-action.primary') as HTMLElement).click();
    await settle();

    // Reopen: the editor must show what was just saved.
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event')!.focus();
    await nextRaf();
    dispatchKey(el, 'F2');
    await settle();
    expect(
      el.shadowRoot!.querySelector<HTMLInputElement>('.editor-title-input')!.value,
    ).toBe('Renamed');
  });
});
