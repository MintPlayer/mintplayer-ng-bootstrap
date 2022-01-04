import { AnimationEvent } from '@angular/animations';
import { Component, ContentChildren, ElementRef, EventEmitter, HostBinding, Inject, OnInit, QueryList, TemplateRef } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { SnackbarAnimationMeta } from '../interfaces/snackbar-animation-meta';
import { BsSnackbarCloseDirective } from '../directives/snackbar-close/snackbar-close.directive';
import { SNACKBAR_CONTENT } from '../providers/snackbar-content.provider';

@Component({
  selector: 'bs-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrls: ['./snackbar.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsSnackbarComponent {

  constructor(@Inject(SNACKBAR_CONTENT) content: TemplateRef<any>) {
    this.content = content;
  }
  
  @HostBinding('class.d-block') displayBlock = true;
  @HostBinding('class.w-100') width100 = true;
  content: TemplateRef<any>;

  protected instance: SnackbarAnimationMeta | null = null;

  //#region Monitor @slideUpDown hooks
  animationState = '';
  animationStateChanged = new EventEmitter<AnimationEvent>();
  onAnimationChanged(event: AnimationEvent) {
    this.animationStateChanged.emit(event);
  }
  //#endregion

}
