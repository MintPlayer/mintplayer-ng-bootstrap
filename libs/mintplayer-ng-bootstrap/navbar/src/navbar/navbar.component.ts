import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, HostListener, input, signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Breakpoint, Color } from '@mintplayer/ng-bootstrap';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarComponent {

  constructor(private destroy: DestroyRef) {
    toObservable(this.windowWidth)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.isResizing.set(false));

    this.onWindowResize();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizing.set(true);
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  @ViewChild('nav') nav!: ElementRef;
  autoclose = input(true);

  expandButtonTemplate: TemplateRef<any> | null = null;

  isExpanded = signal<boolean>(false);
  windowWidth = signal<number | null>(null);
  isResizing = signal<boolean>(false);

  color = input<Color | null>(null);
  breakpoint = input<Breakpoint | null>('md');

  expandAt = computed(() => {
    const breakpoint = this.breakpoint();
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

  isSmallMode = computed(() => {
    const expandAt = this.expandAt();
    const windowWidth = this.windowWidth();
    if (windowWidth === null) {
      return true;
    } else if (!expandAt) {
      return true;
    } else if (windowWidth >= expandAt) {
      return false;
    } else {
      return true;
    }
  });

  expandClass = computed(() => {
    const breakpoint = this.breakpoint();
    if (breakpoint === null) {
      return null;
    } else {
      return `navbar-expand-${breakpoint}`;
    }
  });

  wAutoClass = computed(() => {
    const breakpoint = this.breakpoint();
    if (breakpoint === null) {
      return null;
    } else {
      return `w-${breakpoint}-auto`;
    }
  });

  dNoneClass = computed(() => {
    const breakpoint = this.breakpoint();
    if (breakpoint === null) {
      return null;
    } else {
      return `d-${breakpoint}-none`;
    }
  });

  backgroundColorClass = computed(() => {
    const color = this.color();
    switch (color) {
      case Color.light:
      case null:
        return ['navbar-light'];
      default:
        return ['navbar-dark', `bg-${Color[color]}`];
    }
  });

  navClassList = computed(() => {
    const expandClass = this.expandClass();
    const backgroundColorClass = this.backgroundColorClass();
    const result: string[] = [];
    return result.concat(expandClass ?? [], ...backgroundColorClass);
  });

  toggleExpanded() {
    this.isExpanded.update(v => !v);
  }
}
