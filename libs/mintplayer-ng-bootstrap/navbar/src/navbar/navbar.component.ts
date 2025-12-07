import { Component, ElementRef, HostListener, Input, TemplateRef, ViewChild, signal, computed, effect } from '@angular/core';
import { Breakpoint, Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false,
})
export class BsNavbarComponent {

  constructor() {
    this.expandAt = computed(() => {
      const breakpoint = this.breakPointSignal();
      switch (breakpoint) {
        case 'xxl': return 1400;
        case 'xl': return 1200;
        case 'lg': return 992;
        case 'md': return 768;
        case 'sm': return 576;
        case 'xs': return 0;
        default: return null;
      }
    });

    this.isSmallMode = computed(() => {
      const expandAt = this.expandAt();
      const windowWidth = this.windowWidthSignal();
      if (windowWidth === null) {
        return true; // Default to small mode when window width unknown
      } else if (!expandAt) {
        return true;
      } else if (windowWidth >= expandAt) {
        return false;
      } else {
        return true;
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

    this.expandClass = computed(() => {
      const breakpoint = this.breakPointSignal();
      if (breakpoint === null) {
        return null;
      } else {
        return `navbar-expand-${breakpoint}`;
      }
    });
    this.wAutoClass = computed(() => {
      const breakpoint = this.breakPointSignal();
      if (breakpoint === null) {
        return null;
      } else {
        return `w-${breakpoint}-auto`;
      }
    });
    this.dNoneClass = computed(() => {
      const breakpoint = this.breakPointSignal();
      if (breakpoint === null) {
        return null;
      } else {
        return `d-${breakpoint}-none`;
      }
    });

    this.backgroundColorClass = computed(() => {
      const color = this.colorSignal();
      switch (color) {
        case Color.light:
        case null:
          return ['navbar-light'];
        default:
          return ['navbar-dark', `bg-${Color[color]}`];
      }
    });

    this.navClassList = computed(() => {
      const expandClass = this.expandClass();
      const backgroundColorClass = this.backgroundColorClass();
      const result: string[] = [];
      return result.concat(expandClass ?? [], ...backgroundColorClass);
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizingSignal.set(true);
    if (typeof window !== 'undefined') {
      this.windowWidthSignal.set(window.innerWidth);
    }
  }

  @ViewChild('nav') nav!: ElementRef;
  @Input() autoclose = true;

  expandButtonTemplate: TemplateRef<any> | null = null;


  expandClass;
  wAutoClass;
  dNoneClass;
  isExpandedSignal = signal<boolean>(false);
  windowWidthSignal = signal<number | null>(null);
  isResizingSignal = signal<boolean>(false);
  expandAt;
  isSmallMode;
  backgroundColorClass;
  navClassList;

  toggleExpanded() {
    this.isExpandedSignal.set(!this.isExpandedSignal());
  }

  //#region Color
  colorSignal = signal<Color | null>(null);
  public get color() {
    return this.colorSignal();
  }
  @Input() public set color(value: Color | null) {
    this.colorSignal.set(value);
  }
  //#endregion

  //#region Breakpoint
  breakPointSignal = signal<Breakpoint | null>('md');
  public get breakpoint() {
    return this.breakPointSignal();
  }
  @Input() public set breakpoint(value: Breakpoint | null) {
    this.breakPointSignal.set(value);
  }
  //#endregion


}
