import { NgForOf } from '@angular/common';
import { Directive, Input, NgIterable, Self } from '@angular/core';

@Directive({
  selector: '[ngForBsTrackByIndex]',
})
export class BsTrackByIndexDirective<T> {
  constructor(@Self() ngFor: NgForOf<T>) {
    ngFor.ngForTrackBy = (index: number, item: T) => index;
  }

  @Input() ngForOf!: NgIterable<T> | null;
}

