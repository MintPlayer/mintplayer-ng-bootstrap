import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { styles } from './mp-time-list.element.template';
import { RovingFocus } from '@mintplayer/web-components/a11y';

export type TimeStep = 1 | 5 | 10 | 15 | 30 | 60;
export type Hour12Mode = boolean | 'auto';

interface TimeSlot {
  /** Minutes from midnight (0..1439). */
  minutes: number;
  /** Date for the slot — uses today's date as the carrier. */
  date: Date;
  label: string;
}

let instanceCounter = 0;

/**
 * A `Date`'s time-of-day as minutes from midnight, for feeding
 * `mp-time-list`'s `minMinutes` / `maxMinutes`.
 *
 * Exported because every composite that owns a time list has to make this
 * conversion, and each one has to decide FIRST whether its bound is a
 * time-of-day (`mp-timepicker`: convert unconditionally) or a datetime
 * (`mp-datetime-picker`: convert only on the bound's own day, `null`
 * otherwise). Naming the step makes that decision visible at the call site.
 */
export function minutesOfDay(d: Date | null | undefined): number | null {
  return d ? d.getHours() * 60 + d.getMinutes() : null;
}

/**
 * mp-time-list — Bootstrap-styled time-slot listbox primitive.
 *
 * Standalone Lit element. Renders a list of equally-spaced time slots
 * (`step`-minute granularity) covering 00:00–23:45 by default. Each slot is
 * `role="option"` with `aria-selected` reflecting the currently selected time.
 *
 * Keyboard model (APG Listbox): ArrowUp/Down ±1 slot, Home/End first/last,
 * PageUp/Down ±1 hour, Enter/Space selects (native button activation).
 *
 * Navigation moves REAL focus between the option buttons via roving tabindex
 * (the shared RovingFocus primitive). The previous model kept focus on the host
 * and pointed aria-activedescendant at option ids — but the host holds the
 * attribute while the ids live in its shadow root, and an IDREF resolves only
 * in the holder's own tree, so the reference was permanently dangling and every
 * arrow press announced NOTHING. Real focus crosses shadow boundaries; IDREFs
 * cannot. This was the audit's canonical present-but-inert finding.
 *
 * Events:
 *  - `selected-time-change`  fires on click / Enter / Space (bubbles, composes).
 */
export class MpTimeListElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    selectedTime: { attribute: false },
    step: { attribute: 'step', type: Number, reflect: true },
    minMinutes: { attribute: 'min-minutes', type: Number },
    maxMinutes: { attribute: 'max-minutes', type: Number },
    hour12: { attribute: 'hour12' },
    locale: { attribute: 'locale', type: String, reflect: true },
    _focusedMinutes: { state: true },
  };

  selectedTime: Date | null = null;
  step: TimeStep = 15;
  /**
   * Earliest / latest selectable slot, as **minutes from midnight** — this
   * element is a pure time-of-day primitive and now says so in its types.
   *
   * They were `min`/`max: Date`, which read like datetime bounds but were
   * compared time-of-day only. That ambiguity is not theoretical: a composite
   * editing a range across two days would grey out the same clock range on
   * *every* day, and `mp-timepicker`'s consumers legitimately pass
   * `new Date(2020, 0, 1, 18, 0)` meaning simply "18:00", which any date-aware
   * reading would disable outright. A `Date` can be mistaken for a datetime
   * bound; `minMinutes: 480` cannot. Deriving the per-day value is the
   * COMPOSITE's job — see `mp-datetime-picker`.
   */
  minMinutes: number | null = null;
  maxMinutes: number | null = null;
  hour12: Hour12Mode = 'auto';
  locale: string | undefined = undefined;

  private _focusedMinutes: number | null = null;
  private readonly instanceId = `mp-tl-${++instanceCounter}`;

  /**
   * One tab stop for the whole list; arrows move focus AND the tab stop.
   *
   * `isDisabled: () => false` keeps out-of-range slots IN the traversal —
   * APG-correct (a disabled option should be discoverable, so the user learns
   * the bound exists rather than watching keys do nothing) and consistent with
   * `mp-calendar`, which one popup away was already doing it this way. It is
   * also load-bearing: `moveTo` refuses a disabled target, so with the default
   * predicate PageUp/PageDown became a swallowed keypress the moment bounds
   * were passed — it `preventDefault()`s, then bails. Selection is still
   * refused, in `selectMinutes`, which is where the rule belongs.
   */
  private readonly roving = new RovingFocus({
    items: () => Array.from(this.renderRoot?.querySelectorAll<HTMLButtonElement>('button.slot') ?? []),
    orientation: 'vertical',
    isDisabled: () => false,
    onActiveChange: (item) => {
      const minutes = Number(item.dataset['minutes']);
      if (!Number.isNaN(minutes)) {
        this._focusedMinutes = minutes;
        this.requestUpdate();
      }
    },
  });

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listbox');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Select time');
    // No host tabindex: the options are the tab stop. A focusable host would be
    // a second, silent stop in front of the real one.
    this.addEventListener('keydown', this.onHostKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onHostKeyDown);
  }

  override updated(): void {
    // The tab stop tracks the focusable slot — the user's last arrow position,
    // else the selected time's snap slot — not merely "the first enabled
    // option" that a bare sync() would home to. setActiveItem() moves the tab
    // stop WITHOUT stealing focus, so this is safe on every render.
    const target = this.renderRoot?.querySelector<HTMLButtonElement>(
      `button.slot[data-minutes="${this.focusableMinutes()}"]`,
    );
    if (target) this.roving.setActiveItem(target);
    else this.roving.sync();
  }

  /** Focus the list = focus its active option (the popup calls host.focus()). */
  override focus(options?: FocusOptions): void {
    const active = this.roving.activeItem;
    if (active) active.focus(options);
    else super.focus(options);
  }

  /** All slots between 00:00 and 24:00 - step, in step-minute increments. */
  private slots(): TimeSlot[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = Math.floor((24 * 60) / this.step);
    const result: TimeSlot[] = [];
    for (let i = 0; i < count; i++) {
      const minutes = i * this.step;
      const date = new Date(today.getTime() + minutes * 60_000);
      result.push({ minutes, date, label: this.formatTime(date) });
    }
    return result;
  }

  private formatTime(date: Date): string {
    const useHour12 = this.resolvedHour12();
    return date.toLocaleTimeString(this.locale ?? undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: useHour12,
    });
  }

  /** Resolves `hour12 === 'auto'` against the active locale; explicit wins. */
  private resolvedHour12(): boolean | undefined {
    if (this.hour12 === true) return true;
    if (this.hour12 === false) return false;
    // 'auto' — let Intl decide by passing undefined.
    return undefined;
  }

  /** Time-only minute slot for a Date, ignoring its date portion. */
  private timeMinutes(d: Date): number {
    return d.getHours() * 60 + d.getMinutes();
  }

  private isDisabledMinutes(minutes: number): boolean {
    if (this.minMinutes !== null && minutes < this.minMinutes) return true;
    if (this.maxMinutes !== null && minutes > this.maxMinutes) return true;
    return false;
  }

  private isSelected(minutes: number): boolean {
    if (!this.selectedTime) return false;
    return this.timeMinutes(this.selectedTime) === minutes;
  }

  private focusableMinutes(): number {
    if (this._focusedMinutes !== null) return this._focusedMinutes;
    if (this.selectedTime) {
      // Snap to nearest slot at or below selectedTime.
      const m = this.timeMinutes(this.selectedTime);
      return Math.floor(m / this.step) * this.step;
    }
    return 0;
  }

  private slotId(minutes: number): string {
    return `${this.instanceId}-slot-${minutes}`;
  }

  /* ---- Public API ---- */

  /** Selects a slot programmatically; emits event. No-op if disabled or out-of-range. */
  selectMinutes(minutes: number): void {
    if (this.isDisabledMinutes(minutes)) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(today.getTime() + minutes * 60_000);
    this.selectedTime = date;
    this._focusedMinutes = minutes;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<Date>('selected-time-change', {
        detail: new Date(date.getTime()),
        bubbles: true,
        composed: true,
      }),
    );
  }

  /* ---- Keyboard ---- */

  private onHostKeyDown = (event: KeyboardEvent): void => {
    // Enter/Space are NOT handled here: the options are real <button>s, so
    // activation is native and fires the existing @click handler.
    const k = event.key;
    if (k === 'PageUp' || k === 'PageDown') {
      // ±1 hour — a listbox-specific jump RovingFocus has no opinion about.
      event.preventDefault();
      const slots = this.slots();
      const focused = this.focusableMinutes();
      const target = k === 'PageUp'
        ? Math.max(slots[0].minutes, focused - 60)
        : Math.min(slots[slots.length - 1].minutes, focused + 60);
      const index = slots.findIndex((slot) => slot.minutes === target);
      if (index >= 0) this.roving.moveTo(index);
      return;
    }
    if (this.roving.onKeydown(event)) event.preventDefault();
  };

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const slots = this.slots();
    const focused = this.focusableMinutes();
    return html`
      <ul role="presentation">
        ${slots.map((slot) => this.renderSlot(slot, focused))}
      </ul>
    `;
  }

  private renderSlot(slot: TimeSlot, focused: number): TemplateResult {
    const selected = this.isSelected(slot.minutes);
    const disabled = this.isDisabledMinutes(slot.minutes);
    return html`<li role="presentation">
      <button
        type="button"
        class="slot"
        role="option"
        id="${this.slotId(slot.minutes)}"
        data-minutes="${slot.minutes}"
        aria-selected="${selected ? 'true' : 'false'}"
        aria-disabled="${disabled ? 'true' : nothing}"
        data-focused="${slot.minutes === focused ? 'true' : nothing}"
        @click="${() => this.selectMinutes(slot.minutes)}"
      >${slot.label}</button>
    </li>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-time-list')) {
  customElements.define('mp-time-list', MpTimeListElement);
}
