import { ComponentPortal } from "@angular/cdk/portal";
import { EnvironmentProviders, InjectionToken, Injector, makeEnvironmentProviders } from "@angular/core";
import { BsToastContainerComponent } from "../components/toast-container/toast-container.component";
import { BsToastService } from "../services/toast/toast.service";

export const PORTAL_FACTORY = new InjectionToken<(injector: Injector) => ComponentPortal<any>>('ToastPortalFactory');

export function provideToast(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: PORTAL_FACTORY,
      useValue: (injector: Injector) => {
        return new ComponentPortal(BsToastContainerComponent, null, injector);
      }
    },
    BsToastService
  ]);
}