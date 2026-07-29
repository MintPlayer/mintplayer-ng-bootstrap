import { LitElement, html } from 'lit';
import {
  FormAssociatedMixin,
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from '@mintplayer/web-components/a11y';
import type { MpRadio } from '@mintplayer/web-components/radio';
import { radioGroupStyles } from '../styles/radio-group.styles';

// Side-effect: the group is meaningless without its radios.
import '@mintplayer/web-components/radio';

export interface RadioGroupChangeEventDetail {
  value: string | null;
}

/**
 * `<mp-radio-group>` — the form-associated element for radios (Phase F /
 * decision D5). Individual `<mp-radio>`s each own a shadow root, so native
 * `name` grouping can NEVER form across them (a radio group only exists
 * within one node tree) — this element supplies everything the platform
 * would have: exclusivity, the roving tab stop, arrow move-and-select, and
 * ONE submission entry.
 *
 * Light-DOM `<mp-radio>` children (any nesting, scoped to the nearest group)
 * are the API. The group:
 *  - claims `role="radiogroup"` on itself (a light-DOM host: consumer
 *    `aria-label`/`aria-labelledby` work natively);
 *  - keeps exactly one radio checked (listens for their `change`);
 *  - roves the tab stop THROUGH each radio's inner input via `groupTabIndex`
 *    (`delegatesFocus` means a host tabindex can't remove the input from the
 *    tab order — the input's own tabindex is the only lever);
 *  - moves-and-selects on Arrow keys with wrap and RTL inversion, Home/End;
 *  - stamps aria-posinset/aria-setsize on the radios;
 *  - submits the checked radio's value under ITS OWN `name` attribute.
 *
 * Emits `group-change` with `detail: { value }` on user changes.
 */
export class MpRadioGroup extends FormAssociatedMixin(LitElement) {
  static override styles = [radioGroupStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'name', 'required', 'disabled'];
  }

  #mutations: MutationObserver | null = null;
  /** Value to restore on form reset — captured from the initially-checked radio. */
  #defaultValue: string | null = null;
  #defaultCaptured = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'radiogroup');
    this.addEventListener('change', this.#onRadioChange);
    this.addEventListener('keydown', this.#onKeydown);
    // attributeFilter: framework CVAs (Angular's writeValue, React/Vue model
    // sync) write `checked`/`disabled` PROPERTIES, which the radios reflect as
    // attributes — the only signal an external write ever produces. Watching
    // them keeps the roving stop and validity honest under any writer. Safe
    // from loops: #syncRadios never writes either attribute, and the radios'
    // reflectBoolean is a no-op when the value is unchanged.
    this.#mutations = new MutationObserver(() => this.#syncRadios());
    this.#mutations.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['checked', 'disabled'],
    });
    // Children upgrade after the parent connects; sync once they have.
    queueMicrotask(() => this.#syncRadios());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#onRadioChange);
    this.removeEventListener('keydown', this.#onKeydown);
    this.#mutations?.disconnect();
    this.#mutations = null;
  }

  /** The group's radios, excluding any nested group's. */
  #radios(): MpRadio[] {
    return [...this.querySelectorAll<MpRadio>('mp-radio')].filter(
      (radio) => radio.closest('mp-radio-group') === this,
    );
  }

  get value(): string | null {
    return this.#radios().find((r) => r.checked)?.value ?? null;
  }

  set value(next: string | null) {
    this.#radios().forEach((radio) => {
      radio.checked = radio.value === next && next !== null;
    });
    this.#syncRadios();
    this.syncFormValue();
  }

  #onRadioChange = (event: Event): void => {
    const target = event.target as MpRadio;
    if (!(target instanceof HTMLElement) || target.tagName !== 'MP-RADIO') return;
    const radios = this.#radios();
    if (!radios.includes(target)) return;
    // Exclusivity is OURS to enforce: shadow roots keep native name
    // grouping from ever forming.
    radios.forEach((radio) => {
      if (radio !== target) radio.checked = false;
    });
    this.#syncRadios();
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent<RadioGroupChangeEventDetail>('group-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  /** APG radio group: arrows move AND select, wrapping; Home/End to the ends. */
  #onKeydown = (event: KeyboardEvent): void => {
    const radios = this.#radios();
    if (radios.length === 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

    const current = radios.findIndex((radio) => radio.contains(event.target as Node));
    if (current < 0) return;

    const isDisabled = (index: number) => radios[index].hasAttribute('disabled');
    let target = -1;
    switch (event.key) {
      case forward:
      case 'ArrowDown':
        target = nextEnabledIndex(radios.length, current, 1, true, isDisabled);
        break;
      case backward:
      case 'ArrowUp':
        target = nextEnabledIndex(radios.length, current, -1, true, isDisabled);
        break;
      case 'Home':
        target = firstEnabledIndex(radios.length, isDisabled);
        break;
      case 'End':
        target = lastEnabledIndex(radios.length, isDisabled);
        break;
      default:
        return;
    }
    if (target < 0 || target === current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const next = radios[target];
    next.checked = true;
    radios.forEach((radio) => {
      if (radio !== next) radio.checked = false;
    });
    this.#syncRadios();
    next.focus();
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent<RadioGroupChangeEventDetail>('group-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  /** Roving tab stop (checked, else first enabled) + posinset/setsize. */
  #syncRadios(): void {
    const radios = this.#radios();
    if (radios.length === 0) return;
    if (!this.#defaultCaptured) {
      this.#defaultCaptured = true;
      this.#defaultValue = radios.find((r) => r.checked)?.value ?? null;
      this.syncFormValue();
    }
    const checked = radios.findIndex((radio) => radio.checked);
    const stop =
      checked >= 0
        ? checked
        : firstEnabledIndex(radios.length, (i) => radios[i].hasAttribute('disabled'));
    radios.forEach((radio, index) => {
      radio.groupTabIndex = index === stop ? 0 : -1;
      radio.setAttribute('aria-posinset', String(index + 1));
      radio.setAttribute('aria-setsize', String(radios.length));
    });
    this.setFormValidity(
      { valueMissing: this.hasAttribute('required') && checked < 0 },
      'Please select an option.',
    );
  }

  // ---- form association (FormAssociatedHost) ----

  formValue(): string | null {
    return this.value;
  }

  formReset(): void {
    this.value = this.#defaultValue;
  }

  formRestore(state: string | FormData | File | null): void {
    if (typeof state === 'string') this.value = state;
  }

  override render() {
    return html`<slot @slotchange=${() => this.#syncRadios()}></slot>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-radio-group')) {
  customElements.define('mp-radio-group', MpRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-radio-group': MpRadioGroup;
  }
}
