import { Injectable, signal } from '@angular/core';

/**
 * Component-scoped state shared between BsOffcanvasComponent (the dialog renderer)
 * and the bs-offcanvas-header / bs-offcanvas-body components inside the user's
 * template. Provides the ids for aria-labelledby and aria-describedby.
 */
@Injectable()
export class BsOffcanvasContextService {
  readonly headerId = signal<string | null>(null);
  readonly bodyId = signal<string | null>(null);
}
