import { AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, DestroyRef, effect, ElementRef, forwardRef, inject, PLATFORM_ID, QueryList } from '@angular/core';
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
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarItemComponent implements AfterContentInit, AfterContentChecked {

  private navbar = inject(BsNavbarComponent);
  element = inject(ElementRef);
  private destroy = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  parentDropdown = inject(forwardRef(() => BsNavbarDropdownComponent), { optional: true });

  hasDropdown = false;
  anchorTag: HTMLAnchorElement | null = null;
  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent)) dropdowns!: QueryList<BsNavbarDropdownComponent>;

  constructor() {
    // Effect handles future isSmallMode changes after content is initialized
    effect(() => {
      const isSmallMode = this.navbar.isSmallMode();
      this.dropdowns?.forEach((dropdown) => {
        dropdown.showInOverlay = !isSmallMode;
      });
    });
  }

  ngAfterContentInit() {
    // Set initial showInOverlay state after content children are resolved
    // This is needed because the effect runs before @ContentChildren is populated
    const isSmallMode = this.navbar.isSmallMode();
    this.dropdowns?.forEach((dropdown) => {
      dropdown.showInOverlay = !isSmallMode;
    });
  }

  ngAfterContentChecked() {
    this.anchorTag = this.element.nativeElement.querySelector('li a');

    if (this.hasDropdown) {
      if (this.anchorTag) {
        this.anchorTag.classList.add('dropdown-toggle');

        if (isPlatformServer(this.platformId)) {
          this.anchorTag.href = 'javascript:;';
        }

        if (!this.anchorTag.getAttribute('close-init-b')) {
          this.anchorTag.setAttribute('close-init-b', '1');
          this.anchorTag.addEventListener('click', (ev: MouseEvent) => {
            ev.preventDefault();
            this.dropdowns.forEach((dropdown) => {
              const newVisible = !dropdown.isVisible();
              dropdown.isVisible.set(newVisible);
              if (!newVisible) {
                dropdown.childDropdowns.forEach((child) => child.isVisible.set(false));
              }
            });
            return false;
          });
        }
      }
    } else {

      if ((this.dropdowns.length === 0) && this.anchorTag && !this.anchorTag.getAttribute('close-init-a')) {
        this.anchorTag.setAttribute('close-init-a', '1');
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
