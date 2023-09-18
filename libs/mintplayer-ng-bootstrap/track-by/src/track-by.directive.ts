import { NgForOf } from '@angular/common';
import { Directive, Input, NgIterable, Self } from '@angular/core';

@Directive({
  selector: '[ngForBsTrackBy]',
})
export class BsTrackByDirective<T> {
  constructor(@Self() private ngFor: NgForOf<T>) {}

  @Input() ngForOf!: NgIterable<T> | null;

  @Input('ngForBsTrackBy') set bsTrackBy(ngForTrackBy: keyof T) {
    this.ngFor.ngForTrackBy = (index: number, item: T) => item[ngForTrackBy];
  }
}

