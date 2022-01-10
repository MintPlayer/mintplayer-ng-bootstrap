import { OverlayRef } from "@angular/cdk/overlay";
import { ComponentRef } from "@angular/core";
import { BsModalPresenterComponent } from "../component/modal-presenter/modal-presenter.component";

export interface ModalAnimationMeta {
    component: ComponentRef<BsModalPresenterComponent>;
    overlay: OverlayRef;
}