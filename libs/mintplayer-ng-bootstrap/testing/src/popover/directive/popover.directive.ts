import { Directive, Input } from "@angular/core";
import { Position } from "../../types/position";

@Directive({
  selector: '*[bsPopover]',
})
export class BsPopoverMockDirective {
  @Input() public bsPopover: Position = 'top';
}
