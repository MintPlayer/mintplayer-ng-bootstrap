import { Injectable, signal } from '@angular/core';
/**
 * Component-scoped state shared between BsPopoverComponent (the dialog renderer)
 * and the bsPopoverHeader / bsPopoverBody directives applied to the user's
 * template. Provides the ids for aria-labelledby and aria-describedby.
 */
@Injectable()
export class BsPopoverContextService {
  readonly headerId = signal<string | null>(null);
  readonly bodyId = signal<string | null>(null);
}
