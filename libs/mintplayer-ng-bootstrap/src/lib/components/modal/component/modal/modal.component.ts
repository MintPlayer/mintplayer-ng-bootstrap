import { Component, TemplateRef } from "@angular/core";

@Component({
  selector: 'bs-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class BsModalComponent {

  // constructor(@Inject(MODAL_CONTENT) content: TemplateRef<any>) {
  //   this.content = content;
  // }
  // content: TemplateRef<any>;
  
  header!: TemplateRef<any>;
  body!: TemplateRef<any>;
  footer!: TemplateRef<any>;

  // private instance: ModalAnimationMeta | null = null;

  // //#region Monitor @slideUpDown hooks
  // animationState = '';
  // animationStateChanged = new EventEmitter<AnimationEvent>();
  // onAnimationChanged(event: AnimationEvent) {
  //   this.animationStateChanged.emit(event);
  // }
  // //#endregion

}
