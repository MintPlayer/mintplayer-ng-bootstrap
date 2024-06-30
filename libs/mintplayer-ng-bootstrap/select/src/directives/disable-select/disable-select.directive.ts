import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, OnDestroy, Optional } from '@angular/core';
import { NgModel } from '@angular/forms';
import { BsSelectComponent } from '../../component/select.component';

@Directive({
  selector: 'bs-select[disableSelect]',
  standalone: true
})
export class BsDisableSelectDirective implements AfterViewInit, OnDestroy {
  constructor(private element: BsSelectComponent, @Optional() private ngModel: NgModel) {
  }

  ngAfterViewInit() {
    const selectBox = this.element.selectBox.nativeElement;
    selectBox.style.backgroundColor = '#f5f5f5';
    selectBox.style.color = '#888';
    selectBox.style.border = '1px solid #ccc';

    selectBox.onchange = this.onValueChange;
  }

  ngOnDestroy() {
    
  }

  // @HostBinding('style.background-color') background = ' !important';
  // @HostBinding('style.color') color  = ' !important';
  // @HostBinding('style.border') border = ' !important';

  onValueChange(ev: any) {
    const el = this.element?.selectBox?.nativeElement;
    debugger;
    console.log('el.dataset', el.dataset);
    if (el && el.dataset && this.ngModel) {
      // el.selectedIndex = el.dataset['indexOf'](this.ngModel.value);
    }
  }
}
