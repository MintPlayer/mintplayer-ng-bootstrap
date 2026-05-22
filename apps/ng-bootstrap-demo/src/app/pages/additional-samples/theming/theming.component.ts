import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsThemeService } from '@mintplayer/ng-bootstrap/theming';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-theming',
  templateUrl: './theming.component.html',
  styleUrl: './theming.component.scss',
  imports: [BsAlertComponent, BsBadgeComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemingComponent {
  protected readonly theme = inject(BsThemeService);
  protected readonly colors = Color;

  // Live runtime-customization demo: lets the visitor tweak --bs-primary at runtime.
  protected readonly customPrimary = signal('#ff5722');

  setMode(mode: 'auto' | 'light' | 'dark' | string): void {
    this.theme.setMode(mode);
  }

  applyCustomPrimary(): void {
    document.documentElement.style.setProperty('--bs-primary', this.customPrimary());
    document.documentElement.style.setProperty(
      '--bs-primary-rgb',
      hexToRgb(this.customPrimary()),
    );
  }

  resetCustomPrimary(): void {
    document.documentElement.style.removeProperty('--bs-primary');
    document.documentElement.style.removeProperty('--bs-primary-rgb');
  }

  applySepia(): void {
    // Inject a one-off [data-bs-theme="sepia"] block if not already present, then activate it.
    if (!document.getElementById('demo-sepia-theme')) {
      const style = document.createElement('style');
      style.id = 'demo-sepia-theme';
      style.textContent = `
        [data-bs-theme="sepia"] {
          --bs-body-bg: #f4ecd8;
          --bs-body-color: #5b4636;
          --bs-emphasis-color: #3b2a1a;
          --bs-link-color: #8b5a2b;
          --bs-link-hover-color: #5b4636;
          --bs-border-color: #d8c9a5;
        }
      `;
      document.head.appendChild(style);
    }
    this.theme.setMode('sepia');
  }

  protected readonly scssOverridesSnippet = dedent`
    // your-app/src/styles.scss
    // Override Bootstrap SCSS variables BEFORE importing the library's bundle.

    $primary:   #ff5722;
    $body-bg:   #fafafa;
    $body-color: #212529;

    // Then import the library's compiled stylesheet entry.
    @import '@mintplayer/ng-bootstrap/bootstrap.scss';
  `;

  protected readonly runtimeCssVarSnippet = dedent`
    // Set any --bs-* custom property on the root element. Bootstrap reads them
    // live — components re-style on the next browser repaint, no rebuild required.

    document.documentElement.style.setProperty('--bs-primary', '#ff5722');
    document.documentElement.style.setProperty('--bs-primary-rgb', '255, 87, 34');

    // To revert:
    document.documentElement.style.removeProperty('--bs-primary');
    document.documentElement.style.removeProperty('--bs-primary-rgb');
  `;

  protected readonly serviceUsageSnippet = dedent`
    import { Component, inject } from '@angular/core';
    import { BsThemeService } from '@mintplayer/ng-bootstrap/theming';

    @Component({ /* ... */ })
    export class AppComponent {
      private readonly theme = inject(BsThemeService);

      toggleDark()  { this.theme.setMode('dark'); }
      toggleLight() { this.theme.setMode('light'); }
      followSystem() { this.theme.setMode('auto'); }

      // Read state reactively:
      mode = this.theme.mode;                   // 'auto' | 'light' | 'dark' | string
      effective = this.theme.effectiveMode;     // 'light' | 'dark' | string (auto resolved)
    }
  `;

  protected readonly preBootScriptSnippet = dedent`
    <!-- src/index.html — placed in <head>, BEFORE any <link rel="stylesheet"> -->
    <script>
      (function () {
        try {
          var m = localStorage.getItem('bs-theme-mode') || 'auto';
          var r = m === 'auto'
            ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : m;
          document.documentElement.setAttribute('data-bs-theme', r);
        } catch (_) {}
      })();
    </script>
  `;

  protected readonly adaptiveNavbarSnippet = dedent`
    <!-- Pass a Bootstrap utility suffix as a string. Result on the rendered
         <nav>: class="… bg-body-tertiary" with no [data-bs-theme] override,
         so it inherits the page theme from <html data-bs-theme>. -->
    <bs-navbar [color]="'body-tertiary'" [breakpoint]="'lg'">
      <!-- navbar content -->
    </bs-navbar>
  `;

  protected readonly customVariantSnippet = dedent`
    /* your-app/src/styles.scss — author a custom variant once */
    [data-bs-theme="sepia"] {
      --bs-body-bg:          #f4ecd8;
      --bs-body-color:       #5b4636;
      --bs-emphasis-color:   #3b2a1a;
      --bs-link-color:       #8b5a2b;
      --bs-link-hover-color: #5b4636;
      --bs-border-color:     #d8c9a5;
      /* Override any --bs-* variable Bootstrap defines under [data-bs-theme="light"]. */
    }

    // Then activate it from anywhere via the service:
    inject(BsThemeService).setMode('sepia');
  `;
}

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0, 0, 0';
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].join(', ');
}
