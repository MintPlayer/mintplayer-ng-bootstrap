import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsModalContextService } from '../../services/modal-context.service';

@Directive({
  selector: '[bsModalBody]',
  host: {
    '[class.modal-body]': 'true',
  },
})
export class BsModalBodyDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsModalContextService, { optional: true });

  constructor() {
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
