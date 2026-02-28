import { Component, inject, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { EnterFromTopAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation, EnterFromTopAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsModalComponent {

  template = inject<TemplateRef<any>>(MODAL_CONTENT);
  isOpen = false;

}
