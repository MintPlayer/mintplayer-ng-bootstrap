import { Component, inject, Injector, signal, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
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

  template = inject<TemplateRef<any>>(MODAL_CONTENT);
  isOpen = signal(false);
  scrollable = signal(false);

  context = inject(BsModalContextService);
  injector = inject(Injector);
}
