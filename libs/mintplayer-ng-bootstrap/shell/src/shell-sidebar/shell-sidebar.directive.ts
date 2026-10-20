import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * The shell's sidebar content, rendered inside its `<aside>`:
 *
 *     <nav *bsShellSidebar>…</nav>
 */
@Directive({ selector: '[bsShellSidebar]' })
export class BsShellSidebarDirective {
  readonly template = inject(TemplateRef);
}

/**
 * Content for the shell's top bar, rendered after the hamburger:
 *
 *     <div *bsShellTopbar>…brand / nav…</div>
 */
@Directive({ selector: '[bsShellTopbar]' })
export class BsShellTopbarDirective {
  readonly template = inject(TemplateRef);
}
