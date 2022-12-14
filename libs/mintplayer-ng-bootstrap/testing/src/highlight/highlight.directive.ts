import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[highlight]'
})
export class HighlightMockDirective {
  @Input() highlight!: string;
}
