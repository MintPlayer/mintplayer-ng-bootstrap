import { animate, AnimationBuilder, AnimationMetadata, state, style } from '@angular/animations';
import { Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, filter, switchMap, skip, distinctUntilChanged } from 'rxjs/operators';
import { BsOffcanvasHostComponent } from '../../components';

@Directive({
  selector: '[bsOffcanvasPush]',
})
export class BsOffcanvasPushDirective implements OnDestroy {
  constructor(private element: ElementRef<HTMLElement>, private builder: AnimationBuilder) {
    this.offcanvas$.pipe(
      filter(offcanvas => offcanvas !== null),
      switchMap(offcanvas => offcanvas!.state$),
      distinctUntilChanged(),
      filter(state => !!state),
      skip(1),
      takeUntil(this.destroyed$)
    ).subscribe((viewstate) => {
      console.log('state', {viewstate, element: this.element.nativeElement});
      let data: AnimationMetadata[];
      switch (viewstate) {
        case 'open':
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
          break;
        case 'closed':
          data = [
            style({ 'margin-left': '400px', 'margin-right': '-400px' }),
            animate('250ms', style({ 'margin-left': '0', 'margin-right': '0' })),
          ];
          setTimeout(() => {
            if (this.element.nativeElement.parentElement && this.initialOverflowX) {
              this.initialOverflowX.element.style.overflowX = this.initialOverflowX.value;
            }
          }, 260);
          break;
      }
      const b = builder.build(data);
      const player = b.create(this.element.nativeElement, { });

      
      player.play();
    });
  }

  private offcanvas$ = new BehaviorSubject<BsOffcanvasHostComponent | null>(null);
  private destroyed$ = new Subject();
  private initialOverflowX?: {element: HTMLElement, value: string};

  @Input('bsOffcanvasPush') set offcanvas(value: BsOffcanvasHostComponent) {
    this.offcanvas$.next(value);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
