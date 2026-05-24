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

  // ngAfterContentChecked runs many times per CD cycle. These flags are
  // idempotency guards for the one-shot side-effects (classList changes,
  // addEventListener) without leaking marker attributes into the DOM. The
  // previous implementation used DOM attributes (`nav-link-class-added`,
  // `close-init-b`, `close-init-a`) which broke on SSR: server-rendered HTML
  // carried the marker, client hydration read it as "already wired" and
  // skipped attaching the click listeners on the live DOM — so dropdown
  // triggers did nothing after hydration on cold runners.
  private classesApplied = false;
  private dropdownClickHandlerAttached = false;
  private autocloseClickHandlerAttached = false;

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

  ngAfterContentChecked() {
    this.anchorTag = this.element.nativeElement.querySelector('li a');
    if (!this.anchorTag) return;

    // Add nav-link or dropdown-item class (previously done by NavLinkDirective).
    // `classList.add` is idempotent, but the instance flag avoids the per-tick
    // method calls.
    if (!this.classesApplied) {
      this.classesApplied = true;
      if (this.parentDropdown === null) {
        this.anchorTag.classList.add('nav-link');
      } else {
        this.anchorTag.classList.add('dropdown-item');
      }
      this.anchorTag.classList.add('cursor-pointer');
    }

    if (this.hasDropdown()) {
      this.anchorTag.classList.add('dropdown-toggle');

      if (isPlatformServer(this.platformId)) {
        // Make sure the SSR-rendered anchor is a no-op if a noscript user
        // clicks it — the dropdown is revealed by :focus-within instead.
        this.anchorTag.href = 'javascript:;';
        // Do not attach event listeners on the server: the live browser DOM
        // is a separate object on hydration and would never see them.
        return;
      }

      if (!this.dropdownClickHandlerAttached) {
        this.dropdownClickHandlerAttached = true;
        this.anchorTag.addEventListener('click', (ev: MouseEvent) => {
          ev.preventDefault();
          this.dropdowns().forEach((dropdown) => {
            const newVisible = !dropdown.isVisible();
            dropdown.isVisible.set(newVisible);
            if (!newVisible) {
              dropdown.childDropdowns().forEach((child) => child.isVisible.set(false));
            }
          });
          return false;
        });
      }
    } else if (this.dropdowns().length === 0) {
      if (isPlatformServer(this.platformId)) return;

      if (!this.autocloseClickHandlerAttached) {
        this.autocloseClickHandlerAttached = true;
        this.anchorTag.addEventListener('click', (ev: MouseEvent) => {
          let d = this.parentDropdown;
          while (d && d.autoclose()) {
            d.isVisible.set(false);
            d = d.parentDropdown;
          }
          if (this.navbar.autoclose()) {
            // Get the fragment from the link's href
            const href = this.anchorTag?.getAttribute('href') ?? '';
            const fragmentMatch = href.match(/#(.+)$/);
            const fragment = fragmentMatch ? fragmentMatch[1] : null;

            // Always collapse the navbar
            this.navbar.isExpanded.set(false);

            // If in small mode with a fragment, prevent default navigation and
            // navigate after the collapse animation completes to avoid double scroll
            if (this.navbar.isSmallMode() && fragment) {
              ev.preventDefault();

              // After the collapse animation completes, navigate to the anchor
              // This ensures correct scroll position since navbar height is stable
              setTimeout(() => {
                this.router.navigateByUrl(href);
              }, NAVBAR_ANIMATION_DURATION);
            }
          }
        });
      }
    }
  }
}
