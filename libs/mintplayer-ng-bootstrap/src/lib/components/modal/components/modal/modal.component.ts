import { Component, Inject, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsModalComponent {

  constructor(@Inject(MODAL_CONTENT) template: TemplateRef<any>) {
    this.template = template;
  }

  isOpen = false;
  template: TemplateRef<any>;

}
