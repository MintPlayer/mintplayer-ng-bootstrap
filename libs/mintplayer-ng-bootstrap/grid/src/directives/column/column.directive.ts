import { Directive, HostBinding, Input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Directive({
  selector: '[xxs],[xs],[sm],[md],[lg],[xl],[xxl]'
})
export class BsGridColumnDirective {
  constructor(destroy: DestroyRef) {
    combineLatest([this.xxs$, this.xs$, this.sm$, this.md$, this.lg$, this.xl$, this.xxl$])
      .pipe(map(([xxs, xs, sm, md, lg, xl, xxl]) => ({ xxs, xs, sm, md, lg, xl, xxl })))
      .pipe(map((sizes) => {
        return Object.keys(sizes)
          .map(key => ({
            key,
            value: (<any>sizes)[key],
          }))
          .filter(v => v.value)
          .map(v => {
            switch (v.key) {
              case '': return 'col';
              case 'xxs': return `col-${v.value}`;
              default: return `col-${v.key}-${v.value}`;
            }
          })
          .join(' ');
      }))
      .pipe(takeUntilDestroyed(destroy))
      .subscribe((classList) => {
        this.classList = classList;
      });
  }

  // private customColClasses$ = new BehaviorSubject<[col]Definition | '' | undefined>(undefined);
  @HostBinding('class') classList: string | null = null

  xxs$ = new BehaviorSubject<number | undefined>(undefined);
  xs$ = new BehaviorSubject<number | undefined>(undefined);
  sm$ = new BehaviorSubject<number | undefined>(undefined);
  md$ = new BehaviorSubject<number | undefined>(undefined);
  lg$ = new BehaviorSubject<number | undefined>(undefined);
  xl$ = new BehaviorSubject<number | undefined>(undefined);
  xxl$ = new BehaviorSubject<number | undefined>(undefined);

  @Input() public set xxs(value: number | undefined) {
    this.xxs$.next(value);
  }
  @Input() public set xs(value: number | undefined) {
    this.xs$.next(value);
  }
  @Input() public set sm(value: number | undefined) {
    this.sm$.next(value);
  }
  @Input() public set md(value: number | undefined) {
    this.md$.next(value);
  }
  @Input() public set lg(value: number | undefined) {
    this.lg$.next(value);
  }
  @Input() public set xl(value: number | undefined) {
    this.xl$.next(value);
  }
  @Input() public set xxl(value: number | undefined) {
    this.xxl$.next(value);
  }
}

@Directive({
  selector: '[col]'
})
export class BsGridColDirective {
  @HostBinding('class.col') colClass = true;
  @Input() set col(value: undefined) {}
}