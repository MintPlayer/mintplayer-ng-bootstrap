import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { DropdownToggleEventDetail, MpDropdown } from '@mintplayer/web-components/dropdown';

// Side-effect import: registers <mp-dropdown>.
import '@mintplayer/web-components/dropdown';

/**
 * Angular wrapper for `<mp-dropdown>` — the menu dropdown (button/link trigger
 * → menu of items), built on the framework-agnostic WC. Mark the trigger with
 * `bsDropdownTrigger` (it is slotted into the WC's `trigger` slot); items are
 * the remaining projected content.
 *
 *     <bs-dropdown>
 *       <button bsDropdownTrigger class="btn btn-secondary">Menu</button>
 *       <a href="/a">Item A</a>
 *       <a href="/b">Item B</a>
 *     </bs-dropdown>
 *
 * No-JS: the WC is a native `<details>` toggle (works server-rendered as DSD).
 * Hydrated: it repositions as a floating overlay. This is the *menu* dropdown —
 * the input-trigger combobox/listbox stays on `[bsDropdown]` + `bs-dropdown-menu`.
 */
@Component({
  selector: 'bs-dropdown',
  templateUrl: './dropdown.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDropdownComponent {
  /** Whether selecting an item / clicking outside closes the dropdown. */
  readonly autoclose = input(true);
  /** Two-way open state (reflects the WC's `<details open>`). The `model`
   *  provides the `openChange` output for `[(open)]` automatically. */
  readonly open = model(false);

  private readonly el = viewChild.required<ElementRef<MpDropdown>>('dd');

  constructor() {
    effect(() => {
      const node = this.el()?.nativeElement;
      if (node) node.autoclose = this.autoclose();
    });
    effect(() => {
      const node = this.el()?.nativeElement;
      if (node && node.open !== this.open()) node.open = this.open();
    });
  }

  protected onToggle(ev: Event): void {
    // Setting the model emits `openChange` for `[(open)]` consumers.
    this.open.set((ev as CustomEvent<DropdownToggleEventDetail>).detail.open);
  }

  /** Open the dropdown. */
  show(): void { const n = this.el()?.nativeElement; if (n) n.open = true; }
  /** Close the dropdown. */
  hide(): void { const n = this.el()?.nativeElement; if (n) n.open = false; }
  /** Toggle the dropdown. */
  toggle(): void { const n = this.el()?.nativeElement; if (n) n.open = !n.open; }
}
