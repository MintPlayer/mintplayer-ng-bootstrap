import { afterNextRender, Component, ElementRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
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
