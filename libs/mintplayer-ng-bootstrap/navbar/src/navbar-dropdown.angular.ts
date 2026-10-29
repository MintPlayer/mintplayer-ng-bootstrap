import { inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkActive } from '@angular/router';
import type { NavbarDropdownInputs } from '@mintplayer/ui-core/navbar';

/*
 * The Angular extension of the generated `bs-navbar-dropdown` (PRD #437 D10
 * escape hatch): a dropdown whose content holds the active route's link marks
 * its trigger, the way Bootstrap marks an active nav link.
 */

/** `RouterLinkActive` on the host watches the `routerLink`s in the content. */
export const hostDirectives = [RouterLinkActive];

export function extendInputs(inputs: () => NavbarDropdownInputs): () => NavbarDropdownInputs {
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
