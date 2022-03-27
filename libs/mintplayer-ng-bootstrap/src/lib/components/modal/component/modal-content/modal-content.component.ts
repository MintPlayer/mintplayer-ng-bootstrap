import { AnimationEvent } from '@angular/animations';
import { Component, EventEmitter, HostListener, Inject, TemplateRef } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { filter, take } from 'rxjs';
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
  closeOnEscape = false;

  //#region Monitor @fadeInOut hooks
  animationState = '';
  animationStateChanged = new EventEmitter<AnimationEvent>();
  onAnimationChanged(event: AnimationEvent) {
    this.animationStateChanged.emit(event);
  }
  //#endregion

  @HostListener('keydown', ['$event'])
  private onKeyDown(ev: KeyboardEvent) {
    if (this.closeOnEscape && ev.code === 'Escape') {
      this.animationStateChanged.pipe(
        filter(ev => ev.phaseName === 'done' && ev.toState === 'void'),
        take(1)
      ).subscribe(() => this.instance?.overlay.dispose());
  
      this.animationState = 'void';
    }
  }
}
