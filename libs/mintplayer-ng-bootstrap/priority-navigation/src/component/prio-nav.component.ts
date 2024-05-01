import { Component, ContentChildren, ElementRef, HostBinding, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavElementDirective } from '../prio-nav-element.directive';
import { BehaviorSubject, Observable, combineLatest, debounce, debounceTime, from, map, of, reduce, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'bs-prio-nav',
  templateUrl: './prio-nav.component.html',
  styleUrl: './prio-nav.component.scss',
  hostDirectives: [BsObserveSizeDirective]
})
export class BsPrioNavComponent {
  constructor(private observer: BsObserveSizeDirective) {
    const rightBounds$ = this.observers$
      .pipe(map(observers => observers.map((_, index) => observers.slice(0, index + 1))))
      .pipe(switchMap(o => o))
      .pipe(map(o => o.map(dir => dir.width$)), debounceTime(10))
      .pipe(switchMap(o => combineLatest(o)))
      .pipe(map(w => w.map(x => x || 0)))
      .pipe(map((w) => w.map((n, i) => w.slice(0, i + 1).reduce((a,b) => a + b, 0))));

    const show$ = combineLatest([rightBounds$, observer.width$])
      .pipe(map(([el, w]) => {
        console.warn({el, w});
        return el.map(right => {
          if (w) {
            return right <= w;
          } else {
            return true;
          }
        });
      }));

      
    show$.pipe(takeUntilDestroyed()).subscribe((x) => {
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
  }

  observers$ = new BehaviorSubject<BsObserveSizeDirective[]>([]);
}