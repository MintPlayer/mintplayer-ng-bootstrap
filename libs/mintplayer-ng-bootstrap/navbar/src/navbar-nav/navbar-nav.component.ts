import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, HostListener, inject, input, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarNavComponent {

  private cdr = inject(ChangeDetectorRef);
  bsNavbar = inject(BsNavbarComponent);

  windowWidth = signal<number | null>(null);
  isResizing = signal<boolean>(false);
  collapse = input<boolean>(true);

  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  showNavs = computed(() => {
    const isExpanded = this.bsNavbar.isExpanded();
    const expandAt = this.bsNavbar.expandAt();
    const windowWidth = this.windowWidth();

    if (windowWidth === null) {
      return false;
    } else if (expandAt === null) {
      return isExpanded;
    } else if (windowWidth >= expandAt) {
      return true;
    } else {
      return isExpanded;
    }
  });

  constructor() {
    this.onWindowResize();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizing.set(true);
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }

    // Clear any existing timeout to debounce
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // Reset isResizing after debounce period
    this.resizeTimeout = setTimeout(() => {
      this.isResizing.set(false);
      this.cdr.markForCheck();
    }, 300);
  }
}
