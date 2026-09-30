import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { configureBsTheme, type BsThemeConfig } from '@mintplayer/web-components/theming';

/**
 * Configure the document's theme store (PRD dark-mode D4). The only option is
 * `cookieDomain`, passed through verbatim as the `bs-theme-mode` cookie's
 * `Domain=`, so a theme picked on `www.example.com` also applies on
 * `app.example.com`. Browser only: on a server there is no store to configure.
 *
 * `defaultMode` is deliberately not an option. It is declared once, in the HTML
 * (`<meta name="bs-theme-default-mode" content="dark">`), because the pre-boot
 * script has to read it before Angular loads.
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideBsTheme({ cookieDomain: '.example.com' })],
 * });
 * ```
 */
export function provideBsTheme(config: BsThemeConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) configureBsTheme(config);
    }),
  ]);
}
