import { Component, HostBinding, Inject, Input, TemplateRef, signal, computed } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
})
export class BsTooltipComponent {
  constructor(@Inject(TOOLTIP_CONTENT) content: TemplateRef<any>) {
    this.template = content;
    this.positionClass = computed(() => `bs-tooltip-${this.position()}`);
    this.marginClass = computed(() => {
      const position = this.position();
      switch (position) {
        case 'start': return 'me-1';
        case 'end': return 'ms-1';
        case 'top': return 'mb-1';
        case 'bottom': return 'mt-1';
      }
    });
  }

  //#region Position
  position = signal<Position>('bottom');
  //#endregion

  template: TemplateRef<any>;
  positionClass;
  marginClass;

  @HostBinding('class.position-relative') positionRelative = true;

}
