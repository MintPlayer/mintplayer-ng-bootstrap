import { AfterContentInit, AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[navbarContent]'
})
export class NavbarContentDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef) {
  }

  @Input('navbarContent') navbar!: BsNavbarComponent;
  private el!: HTMLElement;

  ngAfterViewInit() {
    this.el = this.element.nativeElement;
    console.log('navbarContent', { element: this.element, navbar: this.navbar });
    this.navbar.heightChange.pipe(takeUntil(this.destroyed$)).subscribe(this.onHeightChange);
  }

  private destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  private onHeightChange(height: number) {
    console.log('element', this.el);
    if (!!this.el) {
      this.el.style.paddingTop = height + 'px';
    } else {
      console.log('nothing happens');
    }
  }
}
