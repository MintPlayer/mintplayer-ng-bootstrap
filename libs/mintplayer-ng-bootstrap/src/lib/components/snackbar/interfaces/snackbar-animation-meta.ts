import { OverlayRef } from "@angular/cdk/overlay";
import { ComponentRef } from "@angular/core";
import { BsSnackbarComponent } from "../component/snackbar.component";

export interface SnackbarAnimationMeta {
    component: ComponentRef<BsSnackbarComponent>;
    overlay: OverlayRef;
}