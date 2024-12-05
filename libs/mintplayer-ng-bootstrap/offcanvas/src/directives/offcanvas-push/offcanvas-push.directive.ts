import { animate, AnimationBuilder, AnimationMetadata, style } from '@angular/animations';
import { Directive, ElementRef, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter, switchMap, skip, distinctUntilChanged } from 'rxjs/operators';
import { BsOffcanvasHostComponent } from '../../components';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[bsOffcanvasPush]',
  standalone: false,
})
export class BsOffcanvasPushDirective {
  constructor(private element: ElementRef<HTMLElement>, private builder: AnimationBuilder) {
    this.offcanvas$.pipe(
      filter(offcanvas => offcanvas !== null),
      switchMap(offcanvas => offcanvas!.isVisible$),
      distinctUntilChanged(),
      skip(1),
      takeUntilDestroyed()
    ).subscribe((isVisible) => {
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

  private offcanvas$ = new BehaviorSubject<BsOffcanvasHostComponent | null>(null);
  private initialOverflowX?: {element: HTMLElement, value: string};

  @Input('bsOffcanvasPush') set offcanvas(value: BsOffcanvasHostComponent) {
    this.offcanvas$.next(value);
  }
}
