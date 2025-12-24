import { AfterContentChecked, ChangeDetectionStrategy, Component, ContentChildren, DestroyRef, effect, ElementRef, forwardRef, inject, PLATFORM_ID, QueryList } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarItemComponent implements AfterContentChecked {

  private navbar = inject(BsNavbarComponent);
  element = inject(ElementRef);
  private destroy = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  parentDropdown = inject(forwardRef(() => BsNavbarDropdownComponent), { optional: true });

  hasDropdown = false;
  anchorTag: HTMLAnchorElement | null = null;
  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent)) dropdowns!: QueryList<BsNavbarDropdownComponent>;

  constructor() {
    effect(() => {
      const isSmallMode = this.navbar.isSmallMode();
      this.dropdowns?.forEach((dropdown) => {
        dropdown.showInOverlay = !isSmallMode;
      });
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
            this.navbar.isExpanded.set(false);
          }
        });
      }

    }
  }
}
