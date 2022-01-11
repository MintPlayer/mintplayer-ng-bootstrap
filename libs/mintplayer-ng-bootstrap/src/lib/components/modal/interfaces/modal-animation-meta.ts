import { OverlayRef } from "@angular/cdk/overlay";
import { ComponentRef } from "@angular/core";
import { BsModalContentComponent } from "../component/modal-content/modal-content.component";

export interface ModalAnimationMeta {
    component: ComponentRef<BsModalContentComponent>;
    overlay: OverlayRef;
}