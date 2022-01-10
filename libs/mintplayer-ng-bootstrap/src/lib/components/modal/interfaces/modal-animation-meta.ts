import { OverlayRef } from "@angular/cdk/overlay";
import { ComponentRef } from "@angular/core";
import { BsModalComponent } from "../component/modal.component";

export interface ModalAnimationMeta {
    component: ComponentRef<BsModalComponent>;
    overlay: OverlayRef;
}