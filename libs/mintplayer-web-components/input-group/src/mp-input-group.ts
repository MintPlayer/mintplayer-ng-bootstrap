import { installLightStyles } from '@mintplayer/web-components/light-dom';
import {
  INPUT_GROUP_SCOPE,
  inputGroupClasses,
  inputGroupRole,
  inputGroupScopedStyles,
  type InputGroupSize,
} from '@mintplayer/ui-core/input-group';

export type MpInputGroupSize = InputGroupSize;

/**
 * `<mp-input-group>`: the Lit front of `ui-core/input-group` (PRD #437 §8). Like
 * `bs-input-group` in Angular, the host IS the `.input-group` (light DOM, no
 * shadow root): its children are the group's items, and Bootstrap's
 * `.input-group > *` rules in the page baseline join them. A control inside a
 * group takes its size and corner pairing from the group's classes and the
 * inherited `--mp-group-radius-*` properties, never from an attribute written
 * onto it.
 *
 * Attributes: `size` (`sm` | `md` | `lg`). An `aria-label` or `aria-labelledby`
 * makes it a `group`; a consumer `role` is kept.
 */
// No HTMLElement on a Node SSR pass: importing the entry there must not throw.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class MpInputGroup extends Base {
  static get observedAttributes(): string[] {
    return ['size', 'aria-label', 'aria-labelledby'];
  }

  /** The `role` this element wrote; a consumer's own role is never touched. */
  #role: string | null = null;
  /** The classes this element added; consumer classes are left alone. */
  #classes: string[] = [];

  get size(): MpInputGroupSize {
    const value = this.getAttribute('size');
    return value === 'sm' || value === 'lg' ? value : 'md';
  }

  set size(value: MpInputGroupSize) {
    if (value === 'md') this.removeAttribute('size');
    else this.setAttribute('size', value);
  }

  connectedCallback(): void {
    this.#sync();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#sync();
  }

  #sync(): void {
    this.setAttribute('data-mps', INPUT_GROUP_SCOPE);
    const classes = inputGroupClasses(this.size);
    this.classList.remove(...this.#classes.filter((c) => !classes.includes(c)));
    this.classList.add(...classes);
    this.#classes = classes;

    const current = this.getAttribute('role');
    if (current !== null && current !== this.#role) return;
    const role = inputGroupRole(this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby'));
    if (role) this.setAttribute('role', role);
    else this.removeAttribute('role');
    this.#role = role;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-input-group')) {
  installLightStyles(INPUT_GROUP_SCOPE, inputGroupScopedStyles);
  customElements.define('mp-input-group', MpInputGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-input-group': MpInputGroup;
  }
}
