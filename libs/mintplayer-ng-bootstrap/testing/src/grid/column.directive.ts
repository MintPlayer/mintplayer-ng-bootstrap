import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsColumn]'
})
export class BsColumnMockDirective {
  @Input() public bsColumn?: object | '';
}
