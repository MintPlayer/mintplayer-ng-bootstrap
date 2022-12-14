import { Directive, Input } from '@angular/core';
import { Position } from '../types/position';

@Directive({
  selector: '*[bsTooltip]'
})
export class BsTooltipMockDirective {
  @Input() bsTooltip: Position = 'bottom';
}
