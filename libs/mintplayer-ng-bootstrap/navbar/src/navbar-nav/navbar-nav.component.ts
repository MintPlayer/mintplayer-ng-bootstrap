import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  standalone: true,
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onWindowResize()',
  },
})
export class BsNavbarNavComponent {

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
    }, 300);
  }
}
