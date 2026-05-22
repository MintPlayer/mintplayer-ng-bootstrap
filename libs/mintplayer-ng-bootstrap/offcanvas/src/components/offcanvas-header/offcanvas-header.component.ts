import { afterNextRender, Component, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsOffcanvasContextService } from '../../services/offcanvas-context.service';
@Component({
  selector: 'bs-offcanvas-header',
  templateUrl: './offcanvas-header.component.html',
  styleUrls: ['./offcanvas-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasHeaderComponent {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);
  private context = inject(BsOffcanvasContextService, { optional: true });

  constructor() {
    afterNextRender(() => {
      const headerDiv = this.el.nativeElement.querySelector<HTMLElement>('.offcanvas-header')!;
      let id = headerDiv.id;
      if (!id) {
        id = this.ids.next('bs-offcanvas-header');
        headerDiv.id = id;
      }
      this.context?.headerId.set(id);
    });
  }
}
