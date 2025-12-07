import { Component, HostListener, Input, signal, computed, effect } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation],
})
export class BsNavbarNavComponent {

  constructor(bsNavbar: BsNavbarComponent) {
    this.bsNavbar = bsNavbar;
    this.showNavs = computed(() => {
      const isExpanded = this.bsNavbar.isExpandedSignal();
      const expandAt = this.bsNavbar.expandAt();
      const windowWidth = this.windowWidthSignal();
      if (windowWidth === null) {
        return isExpanded; // Default to isExpanded when window width unknown
      } else if (expandAt === null) {
        return isExpanded;
      } else if (windowWidth >= expandAt) {
        return true;
      } else {
        return isExpanded;
      }
    });

    // Debounced effect for resizing
    let debounceTimer: any = null;
    effect(() => {
      const windowWidth = this.windowWidthSignal();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.isResizingSignal.set(false);
      }, 300);
    });
    this.onWindowResize();
  }

  bsNavbar: BsNavbarComponent;
  collapseSignal = signal<boolean>(true);
  windowWidthSignal = signal<number | null>(null);
  showNavs;
  isResizingSignal = signal<boolean>(false);

  //#region collapse
  @Input() public set collapse(value: boolean) {
    this.collapseSignal.set(value);
  }
  public get collapse() {
    return this.collapseSignal();
  }
  //#endregion

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizingSignal.set(true);
    if (typeof window !== 'undefined') {
      this.windowWidthSignal.set(window.innerWidth);
    }
  }
}
