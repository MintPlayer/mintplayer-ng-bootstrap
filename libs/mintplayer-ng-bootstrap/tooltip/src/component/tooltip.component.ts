import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: true,
  imports: [NgTemplateOutlet, BsHasOverlayComponent],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsTooltipComponent {
  template = inject<TemplateRef<any>>(TOOLTIP_CONTENT);

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
