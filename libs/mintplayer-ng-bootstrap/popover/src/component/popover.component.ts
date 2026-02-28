import { ChangeDetectionStrategy, Component, computed, Inject, input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';

@Component({
  selector: 'bs-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsPopoverComponent {
  constructor(@Inject(POPOVER_CONTENT) content: TemplateRef<any>) {
    this.template = content;
  }

  position = input<Position>('bottom');
  isVisible = input<boolean>(false);

  marginClass = computed(() => {
    switch (this.position()) {
      case 'top': return 'mb-2';
      case 'start': return 'me-2';
      case 'end': return 'ms-2';
      default: return 'mt-2';
    }
  });

  positionClass = computed(() => `bs-popover-${this.position()}`);

  template: TemplateRef<any>;
}
