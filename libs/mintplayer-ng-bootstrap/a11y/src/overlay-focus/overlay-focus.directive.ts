import { ConfigurableFocusTrap, ConfigurableFocusTrapFactory, InteractivityChecker } from '@angular/cdk/a11y';
import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

export type BsOverlayInitialFocus = HTMLElement | 'first' | 'self' | 'none';

/**
 * Activates a CDK focus trap on the host element while `bsOverlayFocus` is true,
 * captures the trigger before activation, and returns focus to it on deactivation.
 *
 * Initial focus inside the trap defaults to the first tabbable descendant; pass
 * an explicit HTMLElement, 'self' (focus the host), or 'none' to opt out.
 *
 * Background `inert` / `aria-hidden` is intentionally not handled here — it is
 * the consuming component's job (a modal hides app-root, a popover does not).
 */
@Directive({
  selector: '[bsOverlayFocus]',
  exportAs: 'bsOverlayFocus',
})
export class BsOverlayFocusDirective {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private trapFactory = inject(ConfigurableFocusTrapFactory);
  private interactivityChecker = inject(InteractivityChecker);
  private destroyRef = inject(DestroyRef);

  readonly active = input(true, { alias: 'bsOverlayFocus' });
  readonly initialFocus = input<BsOverlayInitialFocus>('first');
  readonly returnFocus = input(true);

  private trap: ConfigurableFocusTrap | null = null;
  private restoreTo: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.active()) this.engage();
      else this.disengage();
    });

    this.destroyRef.onDestroy(() => this.disengage());
  }

  private engage(): void {
    if (this.trap) return;

    this.restoreTo = (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement)
      ? document.activeElement
      : null;

    this.trap = this.trapFactory.create(this.elementRef.nativeElement);

    const target = this.initialFocus();
    if (target instanceof HTMLElement) {
      target.focus();
    } else if (target === 'self') {
      this.elementRef.nativeElement.focus();
    } else if (target === 'first') {
      this.focusFirstTabbable();
    }
    // 'none' — caller manages focus
  }

  private focusFirstTabbable(): void {
    // Walk the host's subtree and let CDK decide what's focusable — handles
    // disabled fieldsets, inert ancestors, and the long tail of edge cases
    // the inline selector would have to re-implement.
    //
    // `isFocusable({ ignoreVisibility: true })` because jsdom doesn't lay
    // elements out, so CDK's default visibility check (`getClientRects()`)
    // would reject everything in tests; in real browsers visible elements
    // pass either way. Tabindex < 0 is filtered manually so the host (which
    // we set `tabindex="-1"` on for the focus trap) doesn't get selected.
    const root = this.elementRef.nativeElement;
    const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node: Node | null = walker.currentNode;
    while (node) {
      if (
        node instanceof HTMLElement
        && node.tabIndex >= 0
        // `:disabled` catches both own `disabled` and the inherited form of
        // it from an ancestor `<fieldset disabled>` — CDK's isFocusable only
        // looks at own attributes.
        && !node.matches(':disabled')
        && this.interactivityChecker.isFocusable(node, { ignoreVisibility: true })
      ) {
        node.focus();
        return;
      }
      node = walker.nextNode();
    }
  }

  private disengage(): void {
    if (!this.trap) return;

    this.trap.destroy();
    this.trap = null;

    if (this.returnFocus() && this.restoreTo && typeof document !== 'undefined' && document.contains(this.restoreTo)) {
      this.restoreTo.focus();
    }
    this.restoreTo = null;
  }
}
