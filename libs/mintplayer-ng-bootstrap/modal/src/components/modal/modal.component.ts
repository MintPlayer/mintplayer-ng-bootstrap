import { Component, inject, Inject, TemplateRef } from '@angular/core';
import { EnterFromTopAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation, EnterFromTopAnimation],
})
export class BsModalComponent {
  isOpen = false;
  template = inject(MODAL_CONTENT);
}
