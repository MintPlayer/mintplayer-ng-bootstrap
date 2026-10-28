import { isTimeDisabled, rovingSlot, timeListKeyTarget } from './timepicker';

/**
 * The time list's DOM behaviour, shared by the list, the time picker and the
 * datetime picker: each renders the slots from connectTimeList() and attaches
 * this to the element holding them.
 */
export interface TimeListHost {
  selected(): number | null;
  focused(): number | null;
  step(): unknown;
  limits(): { minMinutes: number | null; maxMinutes: number | null };
  /** Move the tab stop (re-render); the behaviour focuses the slot after. */
  setFocused(minutes: number): void;
  select(minutes: number): void;
}

/** Focus the slot for `minutes` once it is rendered (the next frames, at most). */
export function focusTimeSlot(root: HTMLElement, minutes: number, frames = 6): void {
  const slot = root.querySelector<HTMLElement>(`[data-minutes="${minutes}"]`);
  if (slot) {
    slot.focus();
    return;
  }
  if (frames > 0 && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => focusTimeSlot(root, minutes, frames - 1));
  }
}

/** The slot holding the tab stop, from the host's state. */
export const rovingSlotOf = (host: TimeListHost) =>
  rovingSlot({ focused: host.focused(), selected: host.selected(), step: host.step() });

export function attachTimeList(root: HTMLElement, host: TimeListHost): () => void {
  const choose = (minutes: number) => {
    const { minMinutes, maxMinutes } = host.limits();
    host.setFocused(minutes);
    if (!isTimeDisabled(minutes, minMinutes, maxMinutes)) host.select(minutes);
  };
  // Enter and Space activate the slot natively: it is a real button.
  const onClick = (event: Event) => {
    const slot = (event.target as Element).closest?.<HTMLElement>('[data-minutes]');
    if (!slot || !root.contains(slot)) return;
    choose(Number(slot.dataset['minutes']));
  };
  const onKeydown = (event: KeyboardEvent) => {
    const slot = (event.target as Element).closest?.<HTMLElement>('[data-minutes]');
    if (!slot || !root.contains(slot)) return;
    const target = timeListKeyTarget(event.key, Number(slot.dataset['minutes']), host.step());
    if (target === null) return;
    event.preventDefault();
    host.setFocused(target);
    focusTimeSlot(root, target);
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
