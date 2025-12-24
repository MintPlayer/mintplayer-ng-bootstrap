import { Directive, inject, TemplateRef, ElementRef } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]',
  standalone: true,
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
    this.id = this.carousel.imageCounter++;
  }
}
