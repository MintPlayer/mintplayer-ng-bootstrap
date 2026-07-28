import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';

/**
 * Makes a nested-host wrapper **transparent to ARIA**: a consumer's `aria-*`,
 * `role`, `id` and `tabindex` written on the `bs-*` element reach the `mp-*`
 * custom element inside it.
 *
 * Apply to the wrapper's inner custom element, which is its template root:
 *
 * ```html
 * <mp-checkbox #checkbox bsForwardAria (change)="onChange($event)">
 * ```
 *
 * **The problem it solves.** Every `bs-*` wrapper renders the real control as a
 * *child*, so a consumer's `aria-label` lands on an element with no role, where
 * ARIA prohibits naming — nothing reaches the control and it stays nameless.
 * `tabindex` is worse than useless: it makes the wrapper focusable, putting a
 * dead tab stop in front of the real control. This replaces three ad-hoc idioms
 * that had grown up around the problem (`bs-checkbox`/`bs-radio`'s
 * `MutationObserver`, `bs-carousel`/`bs-navbar`'s bespoke `[ariaLabel]` input,
 * `bs-select`'s `Renderer2` call) with one directive, so the next wrapper does
 * not invent a fourth.
 *
 * **Copy versus move, and why they differ.** `aria-*` attributes are *copied* and
 * kept live — they carry state (`aria-expanded`, `aria-invalid`) that must be
 * correct at every moment, and duplicating them on an unexposed host is harmless.
 * `role`, `id` and `tabindex` are **moved**, because leaving them would be
 * actively wrong: two elements with one `id` is invalid and breaks every IDREF
 * pointing at it, and a duplicated `tabindex` is the dead-tab-stop defect itself.
 * The host then takes `role="presentation"` so it contributes no extra generic
 * node of its own.
 *
 * **Known limit, stated because it is a real gap and not a rounding error.**
 * Adding any of the three moved attributes later *is* tracked — an addition is an
 * observable mutation. **Removing one after it has been moved is not**, because
 * the attribute is no longer on the host for its removal to be observed. In
 * practice `role`/`id`/`tabindex` are structural and set once, while the
 * attributes that genuinely change at runtime are `aria-*`, which are copied and
 * fully live. If a component ever needs a removable forwarded `tabindex`, give it
 * an explicit input rather than widening this directive.
 */
@Directive({
  selector: '[bsForwardAria]',
})
export class BsForwardAriaDirective implements OnInit {
  private readonly target = inject(ElementRef).nativeElement as HTMLElement;
  /**
   * The wrapper host. `skipSelf` walks from this element's node injector to its
   * parent's, which for a component's template root is the component host — no
   * DOM walking and no assumption about nesting depth.
   */
  private readonly host = inject(ElementRef, { skipSelf: true }).nativeElement as HTMLElement;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Moved rather than copied — see the class comment. */
  private static readonly MOVED = ['role', 'id', 'tabindex'] as const;

  /**
   * The role this directive writes on the host itself, which must therefore never
   * be treated as a *consumer's* role and moved inward.
   *
   * Checked by **value** rather than tracked in an instance flag, and that
   * distinction is the whole fix for an SSR defect: the server pass runs this
   * directive and serialises `role="presentation"` into the HTML, so the client
   * gets a **fresh instance** whose flag is `false` staring at a host that already
   * carries the marker. It moved the marker onto the custom element — making the
   * real component presentational and discarding the name just forwarded to it.
   * A flag cannot survive rehydration; a value check needs nothing to survive.
   *
   * Only `presentation` is claimed, not `none`. They are synonyms to ARIA, but a
   * consumer writing `role="none"` is making a deliberate statement about the
   * *inner* element and it is still forwarded; `presentation` on a wrapper asks for
   * exactly what this directive already does, so there is nothing to forward.
   */
  private static readonly HOST_ROLE = 'presentation';

  constructor() {
    // Attribute *bindings* from the consumer's template are written during the
    // consumer's change detection, which is not guaranteed to have run by
    // ngOnInit. A second pass after render catches those. Both passes are
    // idempotent, so running both costs nothing.
    afterNextRender(() => {
      this.forward();
      this.observe();
    });
  }

  /**
   * Runs on the server too, unlike the `MutationObserver`. That matters: the
   * no-JS and SSR tiers are part of this library's contract, and an
   * accessible name that only appears after hydration is absent exactly when a
   * screen reader first reads the page.
   */
  ngOnInit(): void {
    this.forward();
  }

  private forward(): void {
    for (const { name, value } of Array.from(this.host.attributes)) {
      if (name.startsWith('aria-')) {
        this.target.setAttribute(name, value);
      }
    }

    for (const name of BsForwardAriaDirective.MOVED) {
      const value = this.host.getAttribute(name);
      if (value === null) continue;
      // Our own marker, whether this instance wrote it or a server pass did.
      if (name === 'role' && value === BsForwardAriaDirective.HOST_ROLE) continue;
      this.target.setAttribute(name, value);
      this.host.removeAttribute(name);
    }

    // Only after any consumer role has been moved off it, so this never wins
    // over what the consumer asked for. Idempotent: a second pass — including the
    // first client pass after SSR — finds the marker already present.
    if (!this.host.hasAttribute('role')) {
      this.host.setAttribute('role', BsForwardAriaDirective.HOST_ROLE);
    }
  }

  private observe(): void {
    if (isPlatformServer(this.platformId)) return;

    const observer = new MutationObserver(() => this.forward());
    observer.observe(this.host, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
