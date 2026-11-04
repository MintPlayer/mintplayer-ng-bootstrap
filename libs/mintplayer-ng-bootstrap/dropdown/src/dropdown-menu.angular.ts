import { inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkActive } from '@angular/router';
import type { DropdownMenuInputs } from '@mintplayer/ui-core/dropdown';

/*
 * The Angular extension of the generated `bs-dropdown-menu` (PRD #437 D10
 * escape hatch): in a navbar, a dropdown whose content holds the active
 * route's link marks its trigger, the way Bootstrap marks an active nav link.
 * Outside a navbar `active` renders nothing. `Router` is provided in root, so
 * this needs no `provideRouter` in an app without routes.
 */

/** `RouterLinkActive` on the host watches the `routerLink`s in the content. */
export const hostDirectives = [RouterLinkActive];

export function extendInputs(inputs: () => DropdownMenuInputs): () => DropdownMenuInputs {
  const rla = inject(RouterLinkActive, { self: true });
  // No class on this host: the state goes on the summary through the bag.
  rla.routerLinkActive = [];
  const routeActive = signal(false);
  rla.isActiveChange.pipe(takeUntilDestroyed()).subscribe((active) => routeActive.set(active));
  return () => {
    const value = inputs();
    return { ...value, active: value.active || routeActive() };
  };
}
