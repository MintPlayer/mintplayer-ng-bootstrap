import type { InjectionKey } from 'vue';

/**
 * The dropdown nesting depth an item or dropdown sits at: -1 directly in a
 * nav group, 0 inside a top-level dropdown, 1+ inside a submenu.
 */
export const NAVBAR_DEPTH: InjectionKey<number> = Symbol('bs-navbar-depth');
