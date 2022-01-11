import { AnimationEvent } from '@angular/animations';
import { Component, EventEmitter, Inject, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { ModalAnimationMeta } from '../../interfaces';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-content',
  templateUrl: './modal-content.component.html',
  styleUrls: ['./modal-content.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsModalContentComponent {

  constructor(@Inject(MODAL_CONTENT) content: TemplateRef<any>) {
    this.content = content;
  }
  content: TemplateRef<any>;
  
  private instance: ModalAnimationMeta | null = null;

  //#region Monitor @slideUpDown hooks
  animationState = '';
  animationStateChanged = new EventEmitter<AnimationEvent>();
  onAnimationChanged(event: AnimationEvent) {
    this.animationStateChanged.emit(event);
  }
  //#endregion
}
