import { ApplicationRef, Directive, effect, ElementRef, inject, Renderer2 } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
  host: {
    '[attr.aria-haspopup]': '"true"',
    '(click)': 'onClick()',
  }
})
export class BsDropdownToggleDirective {
  private dropdown = inject(BsDropdownDirective);
  private renderer = inject(Renderer2);
  private elementRef = inject(ElementRef);
  private appRef = inject(ApplicationRef);

  toggleButton = this.elementRef;

  constructor() {
    effect(() => {
      const isOpen = this.dropdown.isOpen();
      this.renderer.setAttribute(this.elementRef.nativeElement, 'aria-expanded', String(isOpen));
    });
  }

  onClick() {
    this.dropdown.isOpen.set(!this.dropdown.isOpen());
    this.appRef.tick();
  }
}
