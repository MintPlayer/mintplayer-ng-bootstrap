import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapModal } from '@mintplayer/ui-core/bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsModalContextService } from '../../services/modal-context.service';

@Directive({
  selector: '[bsModalBody]',
  host: {
    '[attr.data-mps]': '"modal"',
    '[class.modal-body]': 'true',
  },
})
export class BsModalBodyDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsModalContextService, { optional: true });

  constructor() {
    // #452: the modal partial ships with this component, scoped to the elements it stamps (data-mps="modal").
    useBootstrap(bootstrapModal);
    afterNextRender(() => {
      let id = this.el.nativeElement.id;
      if (!id) {
        id = this.ids.next('bs-modal-body');
        this.el.nativeElement.id = id;
      }
      this.context?.bodyId.set(id);
    });
  }
}
