import { Component, HostBinding, Inject, Input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '../../../enums/position.enum';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsTooltipComponent {
  constructor(@Inject(TOOLTIP_CONTENT) content: TemplateRef<any>) {
    this.template = content;  
  }

  positions = Position;
  @Input() public position: Position = Position.bottom;
  template: TemplateRef<any>;

  @HostBinding('class.position-relative') positionRelative = true;

}
