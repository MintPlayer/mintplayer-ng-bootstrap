import { LitElement } from 'lit';
import { applyHostProps, EMPTY_HOST_PROPS, LightChildren } from '@mintplayer/web-components/machine';
import { connectNavbarContents, connectNavbarDropdown } from '@mintplayer/ui-core/navbar';
import { navbarDropdownTemplate } from '../generated/navbar-dropdown.view.generated';

const CONTENTS = connectNavbarContents();

/**
 * `<mp-navbar-dropdown>` — a navbar dropdown, or a submenu when nested (#437),
 * rendered from the template compiled out of `@mintplayer/ui-core/navbar`: a
 * native `<details>` whose `<summary>` is the label and whose `.dropdown-menu`
 * panel holds the items, so it opens with JavaScript off. The element itself
 * is taken out of the layout; the `<details>` is the flex item.
 *
 *     <mp-navbar-dropdown label="Products">
 *       <mp-navbar-item><a href="/widgets">Widgets</a></mp-navbar-item>
 *       <mp-navbar-dropdown>                        <!-- submenu -->
 *         <span slot="label">More</span>
 *         <mp-navbar-item><a href="/more">…</a></mp-navbar-item>
 *       </mp-navbar-dropdown>
 *     </mp-navbar-dropdown>
 *
 * Disclosure navigation, not an ARIA menu: every link stays a link in the tab
 * order. Dropdowns at one depth share a `name`, so opening one closes its
 * siblings. The `<mp-navbar>` around it owns the arrow keys, Escape and
 * outside-click closing.
 *
 * Attributes: `label` (the trigger text; `slot="label"` for markup), `active`
 * (highlights the trigger).
 */
export class MpNavbarDropdown extends LitElement {
  static override properties = {
    label: { type: String },
    active: { type: Boolean, reflect: true },
  };

  declare label: string | undefined;
  declare active: boolean;
  readonly #children = new LightChildren(this);
  #host = EMPTY_HOST_PROPS;

  constructor() {
    super();
    this.active = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  /** 0 in a nav group, one more per enclosing dropdown. */
  get #depth(): number {
    let depth = 0;
    for (let el = this.parentElement?.closest('mp-navbar-dropdown'); el; el = el.parentElement?.closest('mp-navbar-dropdown')) depth++;
    return depth;
  }

  protected override willUpdate(): void {
    this.#children.capture();
  }

  override render() {
    this.#host = applyHostProps(this, this.#host, CONTENTS);
    const { label, default: content } = this.#children.slots;
    return navbarDropdownTemplate({
      view: connectNavbarDropdown({ depth: this.#depth, active: this.active }),
      label: this.label,
      slots: { label, default: content },
    });
  }
}

if (!customElements.get('mp-navbar-dropdown')) {
  customElements.define('mp-navbar-dropdown', MpNavbarDropdown);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-navbar-dropdown': MpNavbarDropdown;
  }
}
