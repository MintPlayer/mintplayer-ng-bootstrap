import { animate, AnimationBuilder, AnimationMetadata, style } from '@angular/animations';
import { Directive, effect, ElementRef, input } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components';

@Directive({
  selector: '[bsOffcanvasPush]',
  standalone: false,
})
export class BsOffcanvasPushDirective {
  constructor(private element: ElementRef<HTMLElement>, private builder: AnimationBuilder) {
    let previousIsVisible: boolean | null = null;

    effect(() => {
      const offcanvas = this.offcanvas();
      if (!offcanvas) return;

      const isVisible = offcanvas.isVisible();

      // Skip the first run (initial state)
      if (previousIsVisible === null) {
        previousIsVisible = isVisible;
        return;
      }

      // Skip if no change
      if (previousIsVisible === isVisible) return;

      previousIsVisible = isVisible;

      let data: AnimationMetadata[];
      if (isVisible) {
        data = [
          style({ 'margin-left': '0', 'margin-right': '0' }),
          animate('250ms', style({ 'margin-left': '400px', 'margin-right': '-400px' })),
        ];
        let el = this.element.nativeElement;
        while (el.parentElement && !['scroll', 'visible'].includes(el.parentElement.style.overflowX)) {
          el = el.parentElement;
        }
        if (this.element.nativeElement.parentElement) {
          this.initialOverflowX = {
            value: this.element.nativeElement.parentElement.style.overflowX,
            element: el,
          };
          el.style.overflowX = 'hidden';
        }
      } else {
        data = [
          style({ 'margin-left': '400px', 'margin-right': '-400px' }),
          animate('250ms', style({ 'margin-left': '0', 'margin-right': '0' })),
        ];
      }
      const b = builder.build(data);
      const player = b.create(this.element.nativeElement, { });

      if (!isVisible) {
        player.onDone(() => {
          if (this.element.nativeElement.parentElement && this.initialOverflowX) {
            this.initialOverflowX.element.style.overflowX = this.initialOverflowX.value;
          }
        });
      }

      player.play();
    });
  }

  private initialOverflowX?: {element: HTMLElement, value: string};

  offcanvas = input<BsOffcanvasHostComponent | null>(null, { alias: 'bsOffcanvasPush' });
}
