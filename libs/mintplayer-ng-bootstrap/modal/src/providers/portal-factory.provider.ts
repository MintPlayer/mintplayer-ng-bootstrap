import { ComponentPortal } from "@angular/cdk/portal";
import { InjectionToken, Injector } from "@angular/core";
import { BsModalComponent } from "../components/modal/modal.component";

export const PORTAL_FACTORY = new InjectionToken<(injector: Injector) => ComponentPortal<BsModalComponent>>('ModalPortalFactory');