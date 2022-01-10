import { AnimationEvent } from '@angular/animations';
import { AfterContentInit, AfterViewInit, Component, ElementRef, EventEmitter, Inject, TemplateRef, ViewChild } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { ModalAnimationMeta } from '../../interfaces/modal-animation-meta';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';

@Component({
  selector: 'bs-modal-presenter',
  templateUrl: './modal-presenter.component.html',
  styleUrls: ['./modal-presenter.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsModalPresenterComponent {

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
