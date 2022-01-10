import { AnimationEvent } from '@angular/animations';
import { Component, EventEmitter, Inject, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { ModalAnimationMeta } from '../interfaces/modal-animation-meta';
import { MODAL_CONTENT } from '../providers/modal-content.provider';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsModalComponent {

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
