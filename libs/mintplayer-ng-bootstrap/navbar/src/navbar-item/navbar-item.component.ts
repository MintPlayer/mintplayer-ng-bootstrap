import { AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, effect, ElementRef, forwardRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Router } from '@angular/router';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

/** Duration of the navbar collapse animation in milliseconds */
const NAVBAR_ANIMATION_DURATION = 300;

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onHostClick($event)',
  },
})
export class BsNavbarItemComponent implements AfterContentInit, AfterContentChecked {

  private navbar = inject(BsNavbarComponent);
  element = inject(ElementRef);
  private destroy = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  parentDropdown = inject(forwardRef(() => BsNavbarDropdownComponent), { optional: true });

  readonly hasDropdown = computed(() => this.dropdowns().length > 0);
  anchorTag: HTMLAnchorElement | null = null;
  readonly dropdowns = contentChildren<BsNavbarDropdownComponent>(forwardRef(() => BsNavbarDropdownComponent));


  constructor() {
    // Effect handles future isSmallMode changes after content is initialized
    effect(() => {
      const isSmallMode = this.navbar.isSmallMode();
      this.dropdowns().forEach((dropdown) => {
        dropdown.showInOverlay = !isSmallMode;
      });
    });
  }

  ngAfterContentInit() {
    // Set initial showInOverlay state after content children are resolved
    // This is needed because the effect runs before @ContentChildren is populated
    const isSmallMode = this.navbar.isSmallMode();
    this.dropdowns().forEach((dropdown) => {
      dropdown.showInOverlay = !isSmallMode;
    });
  }

  // `ngAfterContentChecked` only manages classList state on the
  // consumer-authored `<a>` (so consumers don't have to spell out
  // `class="nav-link"` etc.). The click handling moved off the anchor
  // entirely — see `host: { '(click)': 'onHostClick' }` above and the
  // `onHostClick` method below.
  //
  // classList writes here are idempotent + survive SSR hydration (Angular
  // serializes the post-CD DOM state), so we can re-run them every tick
  // without instance flags or DOM-attribute markers. The previous
  // implementation used DOM-attribute markers (`nav-link-class-added`,
  // `close-init-b`, `close-init-a`) which broke on hydration: server
  // HTML carried the marker, client hydration read it as "already wired"
  // and skipped attaching the click listeners on the live DOM. The host
  // binding approach sidesteps that class of bug — host bindings serialize
  // and re-bind on hydration the same way template bindings do.
  ngAfterContentChecked() {
    const anchor = this.element.nativeElement.querySelector('li a') as HTMLAnchorElement | null;
    this.anchorTag = anchor;
    if (!anchor) return;

    if (this.parentDropdown === null) {
      anchor.classList.add('nav-link');
    } else {
      anchor.classList.add('dropdown-item');
    }
    anchor.classList.add('cursor-pointer');

    if (this.hasDropdown()) {
      anchor.classList.add('dropdown-toggle');
      if (isPlatformServer(this.platformId)) {
        // Make the SSR-rendered anchor a no-op for noscript users — the
        // dropdown is revealed by :focus-within instead.
        anchor.href = 'javascript:;';
      }
    } else {
      anchor.classList.remove('dropdown-toggle');
    }
  }

  /**
   * Host-bound click handler. Fires for any click that bubbles up through
   * this `<bs-navbar-item>`, including descendant navbar-items inside our
   * projected `<bs-navbar-dropdown>`. We filter to the consumer-authored
   * `<a>` element of THIS item (`this.anchorTag`) so the trigger logic only
   * runs when the user clicked OUR anchor — descendant link clicks are
   * already handled by their own navbar-item's host listener.
   *
   * This replaces the previous `addEventListener` calls in
   * `ngAfterContentChecked`, which were brittle: on SSR the marker
   * attribute (`close-init-b`/`-a`) was serialized into the HTML, on the
   * client the guard read it as "already wired" and skipped attaching the
   * listener on the live DOM. Host bindings serialize and re-bind on
   * hydration like template bindings, so no race.
   */
  onHostClick(ev: MouseEvent) {
    const clickedAnchor = (ev.target as Element | null)?.closest('a');
    if (!clickedAnchor || clickedAnchor !== this.anchorTag) return;

    if (this.hasDropdown()) {
      ev.preventDefault();
      this.dropdowns().forEach((dropdown) => {
        const newVisible = !dropdown.isVisible();
        dropdown.isVisible.set(newVisible);
        if (!newVisible) {
          dropdown.childDropdowns().forEach((child) => child.isVisible.set(false));
        }
      });
      return;
    }

    if (this.dropdowns().length === 0) {
      let d = this.parentDropdown;
      while (d && d.autoclose()) {
        d.isVisible.set(false);
        d = d.parentDropdown;
      }
      if (this.navbar.autoclose()) {
        // Fragment-aware navigation: in small mode, collapse the navbar
        // first, then navigate to the fragment after the collapse animation
        // completes — keeps the scroll position correct since the navbar
        // height has stabilised by then.
        const href = clickedAnchor.getAttribute('href') ?? '';
        const fragmentMatch = href.match(/#(.+)$/);
        const fragment = fragmentMatch ? fragmentMatch[1] : null;

        this.navbar.isExpanded.set(false);

        if (this.navbar.isSmallMode() && fragment) {
          ev.preventDefault();
          setTimeout(() => {
            this.router.navigateByUrl(href);
          }, NAVBAR_ANIMATION_DURATION);
        }
      }
    }
  }
}
