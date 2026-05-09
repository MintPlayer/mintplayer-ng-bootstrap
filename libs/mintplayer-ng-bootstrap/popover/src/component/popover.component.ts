import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Injector, input, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';
import { POPOVER_ID } from '../providers/popover-id.provider';
import { BsPopoverContextService } from '../services/popover-context.service';

@Component({
  selector: 'bs-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  imports: [NgTemplateOutlet, BsHasOverlayComponent],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BsPopoverContextService],
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsPopoverComponent {
  template = inject<TemplateRef<any>>(POPOVER_CONTENT);
  popoverId = inject(POPOVER_ID);
  context = inject(BsPopoverContextService);
  injector = inject(Injector);

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
}
