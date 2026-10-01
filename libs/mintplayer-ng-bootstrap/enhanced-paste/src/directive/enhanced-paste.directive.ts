import { Directive, ElementRef, inject, output } from '@angular/core';
import { NgModel } from '@angular/forms';
import { NumberOverflow } from '../interfaces/number-overflow';

/**
 * On a number input bound with `ngModel`, a pasted value outside `min`/`max` is clamped to the
 * nearest bound (and reported through `numberOverflow`) instead of being refused by the browser.
 * A paste that is already in range goes through untouched.
 */
@Directive({
  selector: 'input[type="number"][bsEnhancedPaste]',
  host: {
    '(paste)': 'onPaste($event)',
  },
})
export class EnhancedPasteDirective {
  private element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private model = inject(NgModel);

  readonly numberOverflow = output<NumberOverflow>();

  onPaste(event: ClipboardEvent) {
    const data = event.clipboardData ?? (window as unknown as { clipboardData?: DataTransfer }).clipboardData;
    if (!data) return;

    const min = parseFloat(this.element.nativeElement.min);
    const max = parseFloat(this.element.nativeElement.max);
    const filtered = this.filterInput(data.getData('text'), min, max);
    // In range: let the browser paste it. Preventing it here swallowed every valid paste.
    if (!filtered) return;

    event.preventDefault();
    this.numberOverflow.emit(filtered);
    // `!== undefined`, not truthiness: a bound of 0 is a real bound.
    if (filtered.boundaryValue !== undefined) {
      this.model.control.setValue(filtered.boundaryValue, { emitEvent: false, onlySelf: true });
    }
  }

  filterInput(value: string, min: number, max: number): NumberOverflow | null {
    // parseFloat, not parseInt: 1.5 is over a max of 1.
    const val = parseFloat(value);
    if (isNaN(val)) {
      return { boundary: 'invalid' };
    } else if (val > max) {
      return { boundary: 'max', inputValue: val, boundaryValue: max };
    } else if (val < min) {
      return { boundary: 'min', inputValue: val, boundaryValue: min };
    } else {
      return null;
    }
  }

}
