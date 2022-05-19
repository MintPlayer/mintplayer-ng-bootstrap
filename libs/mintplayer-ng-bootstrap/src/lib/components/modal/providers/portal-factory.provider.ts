import { ComponentPortal } from "@angular/cdk/portal";
import { InjectionToken, Injector } from "@angular/core";

export const PORTAL_FACTORY = new InjectionToken<(injector: Injector) => ComponentPortal<any>>('ModalPortalFactory');