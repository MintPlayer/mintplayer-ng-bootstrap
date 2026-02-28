import { Component, inject, signal, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EnterFromTopAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  imports: [NgTemplateOutlet],
  animations: [FadeInOutAnimation, EnterFromTopAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsModalComponent {

  template = inject<TemplateRef<any>>(MODAL_CONTENT);
  isOpen = signal(false);

}
