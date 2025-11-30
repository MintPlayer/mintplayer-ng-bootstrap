import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: '[bsOverlayContent]',
  standalone: true,
})
export class BsOverlayContentDirective {
  private templateRef = inject(TemplateRef);

  getTemplate(): TemplateRef<any> {
    return this.templateRef;
  }
}
