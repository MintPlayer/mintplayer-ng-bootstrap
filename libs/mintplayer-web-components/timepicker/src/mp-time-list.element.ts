import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { styles } from './mp-time-list.element.template';

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
 * mp-time-list — Bootstrap-styled time-slot listbox primitive.
 *
 * Standalone Lit element. Renders a list of equally-spaced time slots
 * (`step`-minute granularity) covering 00:00–23:45 by default. Each slot is
 * `role="option"` with `aria-selected` reflecting the currently selected time.
 *
 * Keyboard model (APG Listbox): ArrowUp/Down ±1 slot, Home/End first/last,
 * PageUp/Down ±1 hour, Enter/Space selects.
 *
 * Events:
 *  - `selected-time-change`  fires on click / Enter / Space (bubbles, composes).
 */
export class MpTimeListElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    selectedTime: { attribute: false },
    step: { attribute: 'step', type: Number, reflect: true },
    min: { attribute: false },
    max: { attribute: false },
    hour12: { attribute: 'hour12' },
    locale: { attribute: 'locale', type: String, reflect: true },
    _focusedMinutes: { state: true },
  };

  selectedTime: Date | null = null;
  step: TimeStep = 15;
  min: Date | null = null;
  max: Date | null = null;
  hour12: Hour12Mode = 'auto';
  locale: string | undefined = undefined;

  private _focusedMinutes: number | null = null;
  private pendingFocusMove = false;
  private readonly instanceId = `mp-tl-${++instanceCounter}`;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listbox');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Select time');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
    this.addEventListener('keydown', this.onHostKeyDown);
    this.addEventListener('focus', this.onHostFocus);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onHostKeyDown);
    this.removeEventListener('focus', this.onHostFocus);
  }

  override updated(): void {
    if (this.pendingFocusMove) {
      this.pendingFocusMove = false;
      this.scrollFocusedIntoView();
    }
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
    if (this.min && minutes < this.timeMinutes(this.min)) return true;
    if (this.max && minutes > this.timeMinutes(this.max)) return true;
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
    const k = event.key;
    const isNav =
      k === 'ArrowUp' || k === 'ArrowDown' || k === 'Home' || k === 'End' ||
      k === 'PageUp' || k === 'PageDown';
    const isSelect = k === 'Enter' || k === ' ';
    if (!isNav && !isSelect) return;
    event.preventDefault();

    const focused = this.focusableMinutes();
    if (isSelect) {
      this.selectMinutes(focused);
      return;
    }

    const slots = this.slots();
    const minM = slots[0].minutes;
    const maxM = slots[slots.length - 1].minutes;
    let target = focused;
    switch (k) {
      case 'ArrowUp':
        target = Math.max(minM, focused - this.step);
        break;
      case 'ArrowDown':
        target = Math.min(maxM, focused + this.step);
        break;
      case 'Home':
        target = minM;
        break;
      case 'End':
        target = maxM;
        break;
      case 'PageUp':
        target = Math.max(minM, focused - 60);
        break;
      case 'PageDown':
        target = Math.min(maxM, focused + 60);
        break;
    }
    this._focusedMinutes = target;
    this.pendingFocusMove = true;
    this.requestUpdate();
  };

  private onHostFocus = (): void => {
    // Make sure focusedMinutes is initialized so keyboard navigation has a
    // starting position; rendered aria-activedescendant points at it.
    if (this._focusedMinutes === null) {
      this._focusedMinutes = this.focusableMinutes();
      this.requestUpdate();
    }
  };

  private scrollFocusedIntoView(): void {
    const focused = this._focusedMinutes;
    if (focused === null) return;
    const el = this.renderRoot.querySelector<HTMLElement>(`[id="${this.slotId(focused)}"]`);
    if (!el) return;
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ---- Render ---- */

  protected override render(): TemplateResult {
    const slots = this.slots();
    const focused = this.focusableMinutes();
    this.setAttribute('aria-activedescendant', this.slotId(focused));
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
        aria-selected="${selected ? 'true' : 'false'}"
        aria-disabled="${disabled ? 'true' : nothing}"
        ?disabled="${disabled}"
        data-focused="${slot.minutes === focused ? 'true' : nothing}"
        @click="${() => this.selectMinutes(slot.minutes)}"
      >${slot.label}</button>
    </li>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-time-list')) {
  customElements.define('mp-time-list', MpTimeListElement);
}
