import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, TemplateRef } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapTooltip } from '@mintplayer/ui-core/bootstrap/tooltip';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';
import { TOOLTIP_ID } from '../providers/tooltip-id.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  imports: [NgTemplateOutlet, BsHasOverlayComponent],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsTooltipComponent {
  constructor() {
    // #452: the tooltip partial ships with this component, scoped to the elements it stamps (data-mps="tooltip").
    useBootstrap(bootstrapTooltip);
  }

  template = inject<TemplateRef<any>>(TOOLTIP_CONTENT);
  tooltipId = inject(TOOLTIP_ID);

  position = input<Position>('bottom');

  positionClass = computed(() => `bs-tooltip-${this.position()}`);

  marginClass = computed(() => {
    switch (this.position()) {
      case 'start': return 'me-1';
      case 'end': return 'ms-1';
      case 'top': return 'mb-1';
      case 'bottom': return 'mt-1';
    }
  });
}
