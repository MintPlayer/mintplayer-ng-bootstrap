import { Directive } from '@angular/core';

/**
 * Marks the element that should be projected into `<mp-shell>`'s `sidebar`
 * slot. Use as a plain attribute on the sidebar element:
 *
 *     <nav bsShellSidebar>…</nav>
 *
 * (Previously a structural directive capturing a `TemplateRef`; the WC migration
 * replaced template projection with a named slot, so this now just sets
 * `slot="sidebar"` on its host.)
 */
@Directive({
  selector: '[bsShellSidebar]',
  host: {
    '[attr.slot]': "'sidebar'",
  },
})
export class BsShellSidebarDirective {}
