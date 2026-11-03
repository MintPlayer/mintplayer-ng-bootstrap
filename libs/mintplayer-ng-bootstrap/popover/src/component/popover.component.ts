import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Injector, input, TemplateRef } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapPopover } from '@mintplayer/ui-core/bootstrap/popover';
import { bootstrapTransitions } from '@mintplayer/ui-core/bootstrap/transitions';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsOverlayFocusDirective } from '@mintplayer/ng-bootstrap/a11y';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';
import { POPOVER_ID } from '../providers/popover-id.provider';
import { BsPopoverContextService } from '../services/popover-context.service';

@Component({
  selector: 'bs-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  imports: [NgTemplateOutlet, BsHasOverlayComponent, BsOverlayFocusDirective],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BsPopoverContextService],
  host: {
    '[class.position-relative]': 'true',
  },
})
export class BsPopoverComponent {
  constructor() {
    // #452: the popover and transitions partials ship with this component, scoped to the elements it stamps (data-mps="popover").
    useBootstrap(bootstrapPopover, bootstrapTransitions);
  }

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
