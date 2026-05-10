import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsModalContextService } from '../../services/modal-context.service';

@Directive({
  selector: '[bsModalHeader]',
  host: {
    '[class.modal-header]': 'true',
  },
})
export class BsModalHeaderDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsModalContextService, { optional: true });

  constructor() {
    // After first render, all sibling host bindings + static attrs on this element
    // have applied. Read an existing id if the consumer set one, otherwise generate
    // and assign — then publish it to the modal context for aria-labelledby.
    afterNextRender(() => {
      let id = this.el.nativeElement.id;
      if (!id) {
        id = this.ids.next('bs-modal-header');
        this.el.nativeElement.id = id;
      }
      this.context?.headerId.set(id);
    });
  }
}
