import { ChangeDetectionStrategy, Component, computed, Inject, input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';

@Component({
  selector: 'bs-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsTooltipComponent {
  constructor(@Inject(TOOLTIP_CONTENT) content: TemplateRef<any>) {
    this.template = content;
  }

  position = input<Position>('bottom');
  template: TemplateRef<any>;

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
