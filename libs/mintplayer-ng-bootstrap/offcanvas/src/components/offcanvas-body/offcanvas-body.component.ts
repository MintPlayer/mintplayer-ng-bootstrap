import { afterNextRender, Component, ElementRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapOffcanvas } from '@mintplayer/ui-core/bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsOffcanvasContextService } from '../../services/offcanvas-context.service';

@Component({
  selector: 'bs-offcanvas-body',
  templateUrl: './offcanvas-body.component.html',
  styleUrls: ['./offcanvas-body.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasBodyComponent {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsOffcanvasContextService, { optional: true });

  readonly noPadding = input(false);

  constructor() {
    // #452: the offcanvas partial ships with this component, scoped to the elements it stamps (data-mps="offcanvas").
    useBootstrap(bootstrapOffcanvas);
    afterNextRender(() => {
      const bodyDiv = this.el.nativeElement.querySelector<HTMLElement>('.offcanvas-body')!;
      let id = bodyDiv.id;
      if (!id) {
        id = this.ids.next('bs-offcanvas-body');
        bodyDiv.id = id;
      }
      this.context?.bodyId.set(id);
    });
  }
}
