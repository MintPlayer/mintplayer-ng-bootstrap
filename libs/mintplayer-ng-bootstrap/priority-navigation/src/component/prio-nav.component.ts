import { Component, ContentChildren, ElementRef, HostBinding, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavElementDirective } from '../prio-nav-element.directive';
import { BehaviorSubject, Observable, combineLatest, from, map, of, reduce, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'bs-prio-nav',
  templateUrl: './prio-nav.component.html',
  styleUrl: './prio-nav.component.scss',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsPrioNavComponent {
  constructor(private observer: BsObserveSizeDirective) {
    const obs$ = this.observers$
      .pipe(map(o => o.map(dir => dir.width$)))
      .pipe(switchMap(o => combineLatest(o)))
      .pipe(map(w => w.map(x => x || 0)))
      .pipe(map(w => w.reduce((acc, curr) => acc + curr, 0)));

    obs$.pipe(takeUntilDestroyed()).subscribe((x) => {
      console.log(x);
    });
  }

  @HostBinding('class.d-block')
  @HostBinding('class.clearfix')
  @HostBinding('class.text-nowrap')
  classList = true;
  
  elements$ = new BehaviorSubject<BsPrioNavElementDirective[]>([]);

  overflowButtonTemplate: TemplateRef<any> | null = null;

  @ContentChildren(BsPrioNavElementDirective) set elements(value: QueryList<BsPrioNavElementDirective>) {
    this.elements$.next(value.toArray());
  }

  @ViewChildren('observers') set observers(value: QueryList<BsObserveSizeDirective>) {
    console.warn('set', value);
    this.observers$.next(value.toArray());

    // of(value.map(o => o.width$))
    //   .pipe(switchMap(o => o))
    //   .pipe(switchMap(o => o))
    //   .pipe(reduce((sum, current) => sum + (current ?? 0), 0))
  }

  observers$ = new BehaviorSubject<BsObserveSizeDirective[]>([]);
  // rightBounds$: Observable<number[]>;
}

// interface Product {
//   name: string;
//   price: number;
// }

    // const w1$ = new BehaviorSubject(1);
    // const w2$ = new BehaviorSubject(2);
    // const w3$ = new BehaviorSubject(3);
    // const w4$ = new BehaviorSubject(4);
    // combineLatest([w1$, w2$, w3$, w4$])
    //   .pipe(map(([w1, w2, w3, w4]) => [w1, w2, w3, w4]))
    //   .pipe(reduce((sum, current) => 1, 0));

    // const products: Product[] = [
    //   { name: 'a', price: 1 },
    //   { name: 'b', price: 2 },
    //   { name: 'c', price: 3 },
    //   { name: 'd', price: 4 },
    // ];

    // const checkout = from(products)
    //   .pipe(reduce((acc, currentProduct) => acc + currentProduct.price, 0));