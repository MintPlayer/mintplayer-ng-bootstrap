import { LitElement, html } from 'lit';
import { inputGroupStyles } from '../styles';

/** Bootstrap's input-group sizes. `md` is the default and needs no attribute. */
export type MpInputGroupSize = 'sm' | 'md' | 'lg';

const MP_SIZED = new Set(['sm', 'lg']);

/**
 * `<mp-input-group>` — joins its children into one visually continuous control,
 * the way Bootstrap's `.input-group` does, but for slotted children including
 * `mp-*` controls that keep their own shadow root.
 *
 * ```html
 * <mp-input-group>
 *   <mp-select></mp-select>
 *   <span class="addon">+32</span>
 *   <input type="tel" class="form-control" />
 * </mp-input-group>
 * ```
 *
 * This is the single home of Bootstrap's input-group styling in the WC layer.
 * Two consequences of the shadow boundary a caller should know (measured in the
 * phone-input spikes; see `input-group.styles.scss`):
 *
 * 1. **The group is authoritative about corners and overlap.** Its positional
 *    rules are `!important`, because a normal declaration would lose to the
 *    page's own control styling. A child cannot keep a rounded inner corner by
 *    force; reorder it or leave it out of the group instead.
 * 2. **`mp-*` children participate through an inherited contract, automatically.**
 *    No rule from here can reach inside another control's shadow root, so the
 *    group sets `--mp-group-radius-start`/`-end` on the child and the shared
 *    `_styles` box sheets (`form-select`, `form-control`) consume them. Any
 *    control built on those sheets pairs its corners with no opt-in; light-DOM
 *    children need no cooperation at all.
 *
 * Tier: JS-only. With scripts off this element does not upgrade and its children
 * render unjoined but fully usable — the correct degradation for what is purely
 * a visual grouping.
 */
export class MpInputGroup extends LitElement {
  static override styles = inputGroupStyles;

  /**
   * Deliberately NOT `delegatesFocus`. Measured in spike S5: it changes neither
   * `focus()` behaviour nor tab order here, and it would impose focus semantics
   * on every consumer of a generic container.
   */

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'size', 'aria-label', 'aria-labelledby'];
  }

  /**
   * Bootstrap sizing. Sizes light-DOM children from the group's own stylesheet
   * and is **mirrored onto `mp-*` children as their `size` attribute**, so each
   * control sizes itself through the API it already has instead of the group
   * inventing a second one.
   */
  get size(): MpInputGroupSize {
    const value = this.getAttribute('size');
    return value === 'sm' || value === 'lg' ? value : 'md';
  }

  set size(value: MpInputGroupSize) {
    if (value === 'md') this.removeAttribute('size');
    else this.setAttribute('size', value);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'size') this.#mirrorSize();
    else this.#syncRole();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncRole();
  }

  override render() {
    return html`<div class="input-group" part="group"><slot @slotchange=${this.#onSlotChange}></slot></div>`;
  }

  /**
   * A group is only a `group` once it has a name — an unnamed one is decorative
   * and would just add noise to the accessibility tree. Kept in sync rather than
   * set once: a consumer localizing `aria-label` late must not lose the role.
   */
  #syncRole(): void {
    const named = this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby');
    if (named && !this.hasAttribute('role')) this.setAttribute('role', 'group');
    else if (!named && this.getAttribute('role') === 'group') this.removeAttribute('role');
  }

  #onSlotChange(): void {
    this.#mirrorSize();
  }

  /**
   * The control to size for a given slotted child.
   *
   * A framework wrapper is not the control: Angular slots `<bs-select>`, whose
   * `mp-select` lives one level in, and writing the attribute on the wrapper reaches
   * nothing — a signal input does not observe a runtime `setAttribute`, and the
   * wrapper forwards only `aria-*`. React and Vue root at the `mp-*` tag, so there
   * the child already IS the control. Descending covers both without the group
   * knowing which framework it is in (PRD §14.5).
   */
  static #controlFor(el: Element): Element | undefined {
    if (el.tagName.startsWith('MP-')) return el;
    return [...el.children].find((child) => child.tagName.startsWith('MP-'));
  }

  #mirrorSize(): void {
    const size = this.size;
    const controls = [...this.children]
      .map((el) => MpInputGroup.#controlFor(el))
      .filter((el): el is Element => el !== undefined);

    for (const el of controls) {
      // `md` is the absence of a size in Bootstrap, so remove rather than write
      // it — a control could not otherwise tell "unset" from "explicitly medium".
      // Only sm/lg are ever cleared, so a control's own unrelated `size` value
      // (an mp-select `numberVisible`-style API) is never clobbered.
      if (size !== 'md') el.setAttribute('size', size);
      else if (MP_SIZED.has(el.getAttribute('size') ?? '')) el.removeAttribute('size');
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-input-group')) {
  customElements.define('mp-input-group', MpInputGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-input-group': MpInputGroup;
  }
}
