import { Input, ViewContainerRef } from '@angular/core';
import { Directive, AfterViewInit } from '@angular/core';

@Directive({
  selector: '*[autofocus]'
})
export class FocusOnLoadDirective implements AfterViewInit {

  constructor(
    private viewContainer: ViewContainerRef
  ) {
    const container = (<any>this.viewContainer)['_lContainer'][0]
    if (container instanceof HTMLElement) {
      this.inputBox = <HTMLInputElement>container;
    } else {
      this.inputBox = container[8];
    }
  }

  private readonly inputBox!: any;

  private _autofocus = true;
  @Input() public set autofocus(value: any) {
    if (value === '') {
      // <bs-select2 ... autofocus></bs-select2>
      value = true;
    }
    this._autofocus = value;  
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this._autofocus) {
        this.inputBox.focus();
      }
    }, 10);
  }
}