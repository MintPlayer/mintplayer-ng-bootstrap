import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]'
})
export class BsScrollspyDirective {

  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;

  // ngOnInit() {
  //   this.scrollspyService.scrollspyDirectives.push(this);
  // }

  // ngOnDestroy() {
  //   this.scrollspyService.scrollspyDirectives.splice(this.scrollspyService.scrollspyDirectives.indexOf(this), 1);
  // }

}
