import { Injectable, signal } from '@angular/core';
/**
 * Component-scoped state shared between BsModalComponent (the dialog renderer)
 * and the bsModalHeader / bsModalBody directives applied to the user's template.
 * Provides the ids for aria-labelledby and aria-describedby.
 */
@Injectable()
export class BsModalContextService {
  readonly headerId = signal<string | null>(null);
  readonly bodyId = signal<string | null>(null);
}
