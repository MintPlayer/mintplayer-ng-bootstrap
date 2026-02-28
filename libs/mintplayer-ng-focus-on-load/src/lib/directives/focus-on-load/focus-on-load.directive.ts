import { computed, input, ViewContainerRef, Directive, AfterViewInit } from '@angular/core';

@Directive({
  selector: '*[autofocus]',
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

  readonly autofocus = input<any>(true);

  private readonly _autofocusResolved = computed(() => {
    const value = this.autofocus();
    return value === '' ? true : value;
  });

  ngAfterViewInit() {
    setTimeout(() => {
      if (this._autofocusResolved()) {
        this.inputBox.focus();
      }
    }, 10);
  }
}