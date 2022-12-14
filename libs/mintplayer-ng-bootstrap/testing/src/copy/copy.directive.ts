import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsCopy]'
})
export class BsCopyMockDirective {
  @Input() bsCopy!: string;
}
