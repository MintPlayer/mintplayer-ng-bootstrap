import { Directive, inject, TemplateRef, ElementRef } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]',
})
export class BsCarouselImageDirective {
  private templateRef = inject(TemplateRef<any>);
  private carousel = inject(BsCarouselComponent);
  private element = inject(ElementRef<HTMLElement>);

  public itemTemplate: TemplateRef<any>;
  id: number;
  isFirst = false;

  constructor() {
    this.itemTemplate = this.templateRef;
    // Post-increment semantics: this.id gets the OLD value, then the counter increments.
    this.id = this.carousel.imageCounter();
    this.carousel.imageCounter.update(c => c + 1);
  }
}
