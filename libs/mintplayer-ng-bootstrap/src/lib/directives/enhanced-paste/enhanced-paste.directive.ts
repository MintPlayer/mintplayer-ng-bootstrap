import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';
import { NgModel } from '@angular/forms';
import { NumberOverflow } from '../../interfaces/number-overflow';

@Directive({
  selector: 'input[type="number"][bsEnhancedPaste]'
})
export class EnhancedPasteDirective {

  constructor(private element: ElementRef<HTMLInputElement>, private model: NgModel) {
  }

  @Output() public numberOverflow = new EventEmitter<NumberOverflow>();

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    // Prevent the default paste event
    event.preventDefault();
    
    // Get data from clipboard
    const data = event.clipboardData || (<any>window).clipboardData;
    const contents = data.getData('text');

    // Get min and max from input
    const min = parseFloat(this.element.nativeElement.min);
    const max = parseFloat(this.element.nativeElement.max);

    const filtered = this.filterInput(contents, min, max);
    if (filtered) {
      this.numberOverflow.emit(filtered);
      if (filtered.boundaryValue) {
        // Update NgModel
        this.model.control.setValue(filtered?.boundaryValue, { emitEvent: false, onlySelf: true });
      }
    }

  }

  filterInput(value: any, min: number, max: number): NumberOverflow | null {
    const val = parseInt(value);
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
