import { InjectionToken } from '@angular/core';

/**
 * DI marker meaning "this content is authored inside a dropdown menu".
 *
 * Provided by `BsDropdownMenuComponent` and `BsNavbarDropdownComponent`;
 * optionally injected by context-aware children (`bs-navbar-item`) to render
 * their `.dropdown-item` shape instead of their nav-link shape, so the same
 * item element works at every nesting level of a navbar.
 *
 * Element injectors follow the CONSUMER template's nesting (not the projection
 * site), so any `<bs-navbar-item>` written between the tags of either provider
 * sees the token — including content projected through `<ng-content>`.
 */
export const BS_DROPDOWN_MENU_CONTEXT = new InjectionToken<boolean>('BS_DROPDOWN_MENU_CONTEXT');
