import { Directive, HostBinding, Input, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject, map, Observable, Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[bsColumn]'
})
export class BsGridColumnDirective implements OnDestroy {
  constructor() {
    this.customColClasses$
      .pipe(map((data) => {
        if (!data) {
          return 'col';
        } else {
          return Object.keys(data)
            .map(key => ({
              key,
              value: (<any>data)[key]
            }))
            .map(v => {
              if (v.key === '_') {
                return `col-${v.value}`;
              } else {
                return `col-${v.key}-${v.value}`;
              }
            })
            .join(' ');
        }
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe((classList) => {
        this.classList = classList;
      });
  }

  private customColClasses$ = new BehaviorSubject<object | '' | undefined>(undefined);
  private destroyed$ = new Subject();
  @HostBinding('class') classList: string | null = null

  @Input() public set bsColumn(value: object | '' | undefined) {
    this.customColClasses$.next(value);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }


}
