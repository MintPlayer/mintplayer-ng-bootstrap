import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridColumnDirective, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import {
  BS_THEME_COOKIE_NAME,
  BS_THEME_DEFAULT_MODE_META,
  BS_THEME_DEFAULT_MODES,
  BsThemeService,
  BsThemeToggleComponent,
  type BsThemeMode,
  type BsThemeToggleMode,
} from '@mintplayer/ng-bootstrap/theming';
import { RouterLink } from '@angular/router';
import { dedent } from 'ts-dedent';

/** Dutch strings for the default cycle: the localization example. */
const DUTCH: Readonly<Record<string, Pick<BsThemeToggleMode, 'label' | 'announcement'>>> = {
  auto: { label: 'Schakel naar automatisch thema', announcement: 'Automatisch thema' },
  light: { label: 'Schakel naar licht thema', announcement: 'Licht thema' },
  dark: { label: 'Schakel naar donker thema', announcement: 'Donker thema' },
};

// Path data copied from bootstrap-icons 1.11.4 (MIT): book-fill.
const BOOK_FILL =
  'M8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783';

/** One row of the API reference table. */
interface ApiEntry {
  readonly name: string;
  readonly kind: string;
  readonly description: string;
}

@Component({
  selector: 'demo-theming',
  templateUrl: './theming.component.html',
  styleUrl: './theming.component.scss',
  imports: [
    BsAlertComponent,
    BsBadgeComponent,
    BsCodeSnippetComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsTableComponent,
    BsThemeToggleComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemingComponent {
  private readonly theme = inject(BsThemeService);
  protected readonly colors = Color;

  protected readonly cookieName = BS_THEME_COOKIE_NAME;
  protected readonly metaName = BS_THEME_DEFAULT_MODE_META;

  protected readonly mode = this.theme.mode;
  protected readonly effectiveMode = this.theme.effectiveMode;
  protected readonly cookieExample = computed(
    () => `${BS_THEME_COOKIE_NAME}=${this.mode()}; Path=/; SameSite=Lax; Max-Age=31536000`,
  );

  /** The default cycle, localized by spreading each entry and overriding its strings. */
  protected readonly dutchModes: readonly BsThemeToggleMode[] = BS_THEME_DEFAULT_MODES.map((m) => ({
    ...m,
    ...DUTCH[m.mode],
  }));

  /** Four modes: the default cycle plus the sepia variant declared in the demo's styles.scss. */
  protected readonly sepiaModes: readonly BsThemeToggleMode[] = [
    ...BS_THEME_DEFAULT_MODES,
    { mode: 'sepia', label: 'Switch to sepia theme', announcement: 'Sepia theme', icon: BOOK_FILL },
  ];

  // Live runtime-customization demo: lets the visitor tweak --bs-primary at runtime.
  protected readonly customPrimary = signal('#ff5722');

  protected readonly apiReference: readonly ApiEntry[] = [
    { name: 'BS_THEME_COOKIE_NAME', kind: 'const', description: "'bs-theme-mode', the cookie that persists the mode." },
    { name: 'BS_THEME_DEFAULT_MODE_META', kind: 'const', description: "'bs-theme-default-mode', the name of the meta tag that declares the site default." },
    { name: 'isValidThemeMode(value)', kind: 'function', description: 'True for 1 to 32 characters of a-z, 0-9 and "-" (case-insensitive). Every mode that reaches markup passes this check.' },
    { name: 'readThemeCookie(cookieString)', kind: 'function', description: 'The lower-cased mode from a Cookie header or document.cookie, or null when it is absent or invalid.' },
    { name: 'resolveServerTheme(cookieHeader, { defaultMode })', kind: 'function', description: 'The data-bs-theme value a server should render: cookie, then default, then auto. null means auto (render no attribute).' },
    { name: 'injectThemeAttribute(html, mode)', kind: 'function', description: 'Sets data-bs-theme on the <html> open tag of a markup string, keeping its other attributes. Idempotent; null leaves the markup unchanged.' },
    { name: 'BsThemeService', kind: 'service', description: 'mode and effectiveMode signals plus setMode(). A mirror of the document theme store; on the server it renders the request cookie.' },
    { name: 'provideBsTheme({ cookieDomain })', kind: 'provider', description: 'Sets the cookie Domain, so a choice made on one subdomain applies on its siblings. Optional.' },
    { name: 'BsThemeToggleComponent', kind: 'component', description: '<bs-theme-toggle>: a button that cycles through [modes]. Its name is the next action, its description the current mode.' },
    { name: 'BS_THEME_DEFAULT_MODES', kind: 'const', description: 'The default [modes] cycle: auto, light, dark. Spread it to localize or extend.' },
  ];

  setMode(mode: BsThemeMode): void {
    this.theme.setMode(mode);
  }

  applyCustomPrimary(): void {
    document.documentElement.style.setProperty('--bs-primary', this.customPrimary());
    document.documentElement.style.setProperty('--bs-primary-rgb', hexToRgb(this.customPrimary()));
  }

  resetCustomPrimary(): void {
    document.documentElement.style.removeProperty('--bs-primary');
    document.documentElement.style.removeProperty('--bs-primary-rgb');
  }

  protected readonly headSnippet = dedent`
    <!-- src/index.html: in <head>, BEFORE any stylesheet -->
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#212529">

    <!-- Optional site default: auto (the default), light, dark or a custom variant -->
    <meta name="bs-theme-default-mode" content="auto">
    <!-- Blocking on purpose: it must set data-bs-theme before the styles apply -->
    <script src="theming/bs-theme-preboot.js"></script>
  `;

  protected readonly assetsSnippet = dedent`
    // angular.json (or project.json): architect.build.options
    "assets": [
      {
        "glob": "bs-theme-preboot.js",
        "input": "node_modules/@mintplayer/web-components/theming",
        "output": "theming"
      }
    ]
  `;

  protected readonly inlineCriticalSnippet = dedent`
    // angular.json (or project.json): architect.build.configurations.production
    "optimization": {
      "scripts": true,
      "styles": { "minify": true, "inlineCritical": false },
      "fonts": true
    }
  `;

  protected readonly defaultToggleSnippet = dedent`
    import { BsThemeToggleComponent } from '@mintplayer/ng-bootstrap/theming';

    @Component({
      imports: [BsThemeToggleComponent],
      template: \`<bs-theme-toggle />\`,
    })
    export class NavbarComponent {}
  `;

  protected readonly localizedToggleSnippet = dedent`
    import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from '@mintplayer/ng-bootstrap/theming';

    const DUTCH: Record<string, Pick<BsThemeToggleMode, 'label' | 'announcement'>> = {
      auto:  { label: 'Schakel naar automatisch thema', announcement: 'Automatisch thema' },
      light: { label: 'Schakel naar licht thema',       announcement: 'Licht thema' },
      dark:  { label: 'Schakel naar donker thema',      announcement: 'Donker thema' },
    };

    // Keep the modes and icons, override only the strings.
    readonly modes = BS_THEME_DEFAULT_MODES.map((m) => ({ ...m, ...DUTCH[m.mode] }));

    // <bs-theme-toggle [modes]="modes" />
  `;

  protected readonly sepiaToggleSnippet = dedent`
    import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from '@mintplayer/ng-bootstrap/theming';

    // The cycle order is the array order: auto, light, dark, sepia, auto, ...
    readonly modes: BsThemeToggleMode[] = [
      ...BS_THEME_DEFAULT_MODES,
      {
        mode: 'sepia',
        label: 'Switch to sepia theme',  // the button's name while sepia is NEXT
        announcement: 'Sepia theme',     // its description while sepia is CURRENT
        icon: 'M8 1.783C7.015.936 ...',  // SVG path data for a 16x16 viewBox
      },
    ];

    // <bs-theme-toggle [modes]="modes" />
  `;

  protected readonly serviceUsageSnippet = dedent`
    import { Component, inject } from '@angular/core';
    import { BsThemeService } from '@mintplayer/ng-bootstrap/theming';

    @Component({ /* ... */ })
    export class AppComponent {
      private readonly theme = inject(BsThemeService);

      toggleDark()   { this.theme.setMode('dark'); }
      toggleLight()  { this.theme.setMode('light'); }
      followSystem() { this.theme.setMode('auto'); }

      // Read state reactively:
      mode = this.theme.mode;               // 'auto' | 'light' | 'dark' | string
      effective = this.theme.effectiveMode; // 'light' | 'dark' | string (auto resolved)
    }
  `;

  protected readonly cookieDomainSnippet = dedent`
    // app.config.ts
    import { provideBsTheme } from '@mintplayer/ng-bootstrap/theming';

    export const appConfig: ApplicationConfig = {
      providers: [
        // Share the choice between www.example.com and app.example.com.
        // Passed through verbatim as the cookie's Domain; never derived.
        provideBsTheme({ cookieDomain: '.example.com' }),
      ],
    };
  `;

  protected readonly ssrProvidersSnippet = dedent`
    // app.config.ts
    import { provideBsTheme } from '@mintplayer/ng-bootstrap/theming';

    export const appConfig: ApplicationConfig = {
      providers: [
        // Renders <html data-bs-theme> from the request cookie on every page.
        provideBsTheme(),
      ],
    };
  `;

  protected readonly varySnippet = dedent`
    // server.ts: in the branch that returns the rendered text/html response
    const headers = new Headers(response.headers);
    headers.append('Vary', 'Cookie');
    return writeResponseToNodeResponse(new Response(body, { status: response.status, headers }), res);
  `;

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
    // live: components re-style on the next browser repaint, no rebuild required.

    document.documentElement.style.setProperty('--bs-primary', '#ff5722');
    document.documentElement.style.setProperty('--bs-primary-rgb', '255, 87, 34');

    // To revert:
    document.documentElement.style.removeProperty('--bs-primary');
    document.documentElement.style.removeProperty('--bs-primary-rgb');
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
    /* your-app/src/styles.scss: author a custom variant once, globally */
    [data-bs-theme="sepia"] {
      /* Required: tells the library's components (select caret, switch knob, ...)
         whether this variant is light or dark. */
      --mp-color-mode: light;
      color-scheme: light;

      --bs-body-bg:          #f4ecd8;
      --bs-body-color:       #5b4636;
      --bs-emphasis-color:   #3b2a1a;
      --bs-link-color:       #8b5a2b;
      --bs-link-hover-color: #5b4636;
      --bs-border-color:     #d8c9a5;
      /* Override any --bs-* variable Bootstrap defines under [data-bs-theme="light"]. */
    }

    // Then activate it from anywhere: a toggle entry, or the service.
    inject(BsThemeService).setMode('sepia');
  `;
}

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0, 0, 0';
  return [m[1], m[2], m[3]].map((part) => parseInt(part, 16)).join(', ');
}
