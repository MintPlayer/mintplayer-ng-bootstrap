import { inject } from '@angular/core';
import type { ThemeToggleInputs } from '@mintplayer/ui-core/theming';
import { BsThemeService } from './lib/service/bs-theme.service';

/*
 * The Angular extension of the generated `bs-theme-toggle` (PRD #437 D10
 * escape hatch). It changes no input: it constructs `BsThemeService`, which the
 * toggle never calls. On the server that constructor is what renders
 * `<html data-bs-theme>` from the request cookie, so an app that renders only a
 * toggle still gets the theme in its SSR output.
 */
export function extendInputs(inputs: () => ThemeToggleInputs): () => ThemeToggleInputs {
  inject(BsThemeService);
  return inputs;
}
