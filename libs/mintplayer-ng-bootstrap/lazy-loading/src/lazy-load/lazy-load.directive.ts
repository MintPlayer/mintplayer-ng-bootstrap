import { Directive, Input, ViewContainerRef } from '@angular/core';

export interface ComponentType<T> {
  new (...args: any[]): T;
}

@Directive({
  selector: '[bsLazyLoad]'
})
export class BsLazyLoadDirective<T> {
  constructor(private vcref: ViewContainerRef) {}

  @Input('bsLazyLoad') set lazyLoad(factory: Promise<ComponentType<T>> | undefined) {
    if (factory) {
      factory.then(type => {
        this.vcref.createComponent(type);
      });
    } else {
      this.vcref.clear();
    }
  }
}