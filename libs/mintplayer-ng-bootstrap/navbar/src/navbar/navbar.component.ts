import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, PLATFORM_ID, signal, TemplateRef, viewChild } from '@angular/core';
import { isPlatformServer, NgTemplateOutlet } from '@angular/common';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';
import { BsUserAgentDirective } from '@mintplayer/ng-bootstrap/user-agent';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { Breakpoint, Color } from '@mintplayer/ng-bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [NgTemplateOutlet, BsContainerComponent, BsUserAgentDirective, BsNoNoscriptDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onWindowResize()',
  },
})
export class BsNavbarComponent {

  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private ids = inject(BsIdService);
  private platformId = inject(PLATFORM_ID);

  /** True only during SSR — drives the noscript-friendly checkbox+label
   *  toggler in the template. In the browser, even during hydration, this is
   *  false so the original <button> renders.
   */
  readonly isServerSide = isPlatformServer(this.platformId);

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

  readonly nav = viewChild.required<ElementRef>('nav');
  autoclose = input(true);
  ariaLabel = input<string>('Main navigation');
  collapseId = input<string>(this.ids.next('bs-navbar-collapse'));
  /** Stable id for the noscript-friendly toggler-checkbox (label[for] target). */
  readonly togglerCheckboxId = this.ids.next('bs-navbar-toggler');

  expandButtonTemplate = signal<TemplateRef<any> | null>(null);

  isExpanded = signal<boolean>(false);
  windowWidth = signal<number | null>(null);
  isResizing = signal<boolean>(false);

  /**
   * What color to render the navbar.
   *
   * - `null` (default): no background, no theme override — navbar is
   *   transparent and follows `<html data-bs-theme>` in both background and
   *   text colors.
   * - A `Color` enum value: emits `bg-{name}` and (where appropriate)
   *   `data-bs-theme="light|dark"` per the mapping in
   *   `docs/issue_324_navbar_modernize_PRD.md` FR-2.
   * - A `string` literal (e.g. `'body-tertiary'`, `'body-secondary'`): emits
   *   `bg-{value}` directly without any `data-bs-theme` override. Use this
   *   for theme-adaptive backgrounds — `bg-body-tertiary` swaps its color
   *   with the page theme automatically via Bootstrap's `--bs-tertiary-bg`.
   */
  color = input<Color | string | null>(null);
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

  /**
   * Background utility class for the rendered `<nav>` (or none).
   *
   * Bootstrap 5.3+ uses `data-bs-theme` for token resolution (see `dataBsTheme`
   * below); the navbar's *background* is an independent decision driven by the
   * `[color]` input. `null` (the default) emits no class so the navbar stays
   * transparent and inherits whatever background sits behind it — the
   * idiomatic adaptive setup pairs this with `class="bg-body-tertiary"` on
   * the consumer side for a theme-aware tinted background.
   */
  bgClass = computed<string | null>(() => {
    const color = this.color();
    if (color === null) return null;
    if (typeof color === 'string') return `bg-${color}`;
    return `bg-${Color[color]}`;
  });

  /**
   * Value for `[attr.data-bs-theme]` on the rendered `<nav>`, or `null` to
   * inherit the page theme. Bootstrap 5.3 deprecated `.navbar-light` /
   * `.navbar-dark` in favour of this attribute — components scope their CSS
   * variables to `[data-bs-theme="light|dark"]`, so setting it on the navbar
   * pins its theme regardless of `<html>`. Omitting it (returning `null`)
   * lets the navbar follow the page's `<html data-bs-theme>` cascade.
   */
  dataBsTheme = computed<'light' | 'dark' | null>(() => {
    const color = this.color();
    if (color === null) return null;
    // String values (e.g. 'body-tertiary') are Bootstrap utility names — the
    // consumer is opting into a theme-aware bg utility and wants the navbar
    // to inherit the page theme.
    if (typeof color === 'string') return null;
    switch (color) {
      case Color.body:
      case Color.transparent:
        return null; // inherit page theme
      case Color.light:
      case Color.white:
        return 'light';
      default:
        return 'dark'; // dark, primary, secondary, success, danger, warning, info
    }
  });

  navClassList = computed(() => {
    const expandClass = this.expandClass();
    const bg = this.bgClass();
    const result: string[] = [];
    if (expandClass) result.push(expandClass);
    if (bg) result.push(bg);
    return result;
  });

  toggleExpanded() {
    this.isExpanded.update(v => !v);
  }
}
