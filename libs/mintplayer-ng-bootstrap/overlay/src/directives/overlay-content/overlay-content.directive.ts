import { Directive, TemplateRef, forwardRef, inject } from '@angular/core';
import { BsOverlayComponent } from '../../components/overlay/overlay.component';

@Directive({
  selector: '[bsOverlayContent]',
  standalone: true,
})
export class BsOverlayContentDirective {
  private templateRef = inject(TemplateRef);
  private overlayHost = inject(forwardRef(() => BsOverlayComponent), { optional: true });

  constructor() {
    if (this.overlayHost) {
      this.overlayHost.registerContent(this.templateRef);
    }
  }

  getTemplate(): TemplateRef<any> {
    return this.templateRef;
  }
}
