import { computed, input, Directive, AfterViewInit, ElementRef, inject } from '@angular/core';

/**
 * Focuses its host shortly after the view initialises, whenever `autofocus` is
 * truthy (a bare `autofocus` attribute counts as true).
 *
 * The host is read through `ElementRef`, which is the host element for a plain
 * element and for a component host alike. A host that overrides `focus()` (the
 * OTP input routes it into its inner control) receives the call.
 */
@Directive({
  selector: '*[autofocus]',
})
export class FocusOnLoadDirective implements AfterViewInit {

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly autofocus = input<any>(true);

  private readonly _autofocusResolved = computed(() => {
    const value = this.autofocus();
    return value === '' ? true : value;
  });

  ngAfterViewInit() {
    setTimeout(() => {
      if (this._autofocusResolved()) {
        this.host.nativeElement.focus();
      }
    }, 10);
  }
}
