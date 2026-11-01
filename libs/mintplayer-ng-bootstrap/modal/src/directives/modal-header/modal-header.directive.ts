import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapModal } from '@mintplayer/ui-core/bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsModalContextService } from '../../services/modal-context.service';

@Directive({
  selector: '[bsModalHeader]',
  host: {
    '[attr.data-mps]': '"modal"',
    '[class.modal-header]': 'true',
  },
})
export class BsModalHeaderDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsModalContextService, { optional: true });

  constructor() {
    // #452: the modal partial ships with this component, scoped to the elements it stamps (data-mps="modal").
    useBootstrap(bootstrapModal);
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
