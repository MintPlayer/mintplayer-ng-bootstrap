import { Directive } from '@angular/core';

/**
 * Marks the `<bs-dropdown>` trigger element. Routes the host into the WC's
 * `trigger` slot (slotted = light DOM, so global Bootstrap / consumer styles
 * apply). The element should be non-interactive content for the toggle — the
 * WC's `<summary>` is the actual toggle; an interactive child would swallow it.
 */
@Directive({
  selector: '[bsDropdownTrigger]',
  host: {
    slot: 'trigger',
  },
})
export class BsDropdownTriggerDirective {}
