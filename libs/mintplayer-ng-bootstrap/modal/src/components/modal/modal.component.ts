import { Component, inject, Injector, signal, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapModal, bootstrapTransitions } from '@mintplayer/ui-core/bootstrap';
import { NgTemplateOutlet } from '@angular/common';
import { EnterFromTopAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { BsOverlayFocusDirective } from '@mintplayer/ng-bootstrap/a11y';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { BsModalContextService } from '../../services/modal-context.service';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  imports: [NgTemplateOutlet, BsOverlayFocusDirective],
  animations: [FadeInOutAnimation, EnterFromTopAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BsModalContextService],
})
export class BsModalComponent {
  constructor() {
    // #452: the modal and transitions partials ship with this component, scoped to the elements it stamps (data-mps="modal").
    useBootstrap(bootstrapModal, bootstrapTransitions);
  }


  template = inject<TemplateRef<any>>(MODAL_CONTENT);
  isOpen = signal(false);
  scrollable = signal(false);

  context = inject(BsModalContextService);
  injector = inject(Injector);
}
