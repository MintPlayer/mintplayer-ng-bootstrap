/// <reference types="../../../types" />

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { BsThemeService, type BsThemeMode } from '@mintplayer/ng-bootstrap/theming';
const CYCLE: ReadonlyArray<BsThemeMode> = ['auto', 'light', 'dark'];

const LABELS: Record<'auto' | 'light' | 'dark', string> = {
  auto: 'Switch to light theme',
  light: 'Switch to dark theme',
  dark: 'Switch to auto theme',
};

@Component({
  selector: 'demo-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  private readonly theme = inject(BsThemeService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly mode = this.theme.mode;

  private readonly autoIcon = signal<SafeHtml | undefined>(undefined);
  private readonly lightIcon = signal<SafeHtml | undefined>(undefined);
  private readonly darkIcon = signal<SafeHtml | undefined>(undefined);

  readonly currentIcon = computed<SafeHtml | undefined>(() => {
    switch (this.mode()) {
      case 'light':
        return this.lightIcon();
      case 'dark':
        return this.darkIcon();
      default:
        return this.autoIcon();
    }
  });

  readonly ariaLabel = computed<string>(() => {
    const m = this.mode();
    if (m === 'light') return LABELS.light;
    if (m === 'dark') return LABELS.dark;
    return LABELS.auto;
  });

  constructor() {
    import('bootstrap-icons/icons/circle-half.svg').then((m) =>
      this.autoIcon.set(this.sanitizer.bypassSecurityTrustHtml(m.default)),
    );
    import('bootstrap-icons/icons/sun-fill.svg').then((m) =>
      this.lightIcon.set(this.sanitizer.bypassSecurityTrustHtml(m.default)),
    );
    import('bootstrap-icons/icons/moon-stars-fill.svg').then((m) =>
      this.darkIcon.set(this.sanitizer.bypassSecurityTrustHtml(m.default)),
    );
  }

  cycle(): void {
    const current = this.mode();
    const i = CYCLE.indexOf(current as 'auto' | 'light' | 'dark');
    const next = i < 0 ? 'auto' : CYCLE[(i + 1) % CYCLE.length];
    this.theme.setMode(next);
  }
}
