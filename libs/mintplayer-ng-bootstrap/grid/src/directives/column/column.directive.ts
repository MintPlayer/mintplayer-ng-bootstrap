import { Directive, HostBinding, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map } from 'rxjs';
import { BsColumnDefinition } from '../../interfaces/column-definition';

@Directive({
  selector: '[bsColumn]'
})
export class BsGridColumnDirective {
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
      .pipe(takeUntilDestroyed())
      .subscribe((classList) => {
        this.classList = classList;
      });
  }

  private customColClasses$ = new BehaviorSubject<BsColumnDefinition | '' | undefined>(undefined);
  @HostBinding('class') classList: string | null = null

  @Input() public set bsColumn(value: BsColumnDefinition | '' | undefined) {
    this.customColClasses$.next(value);
  }
}
