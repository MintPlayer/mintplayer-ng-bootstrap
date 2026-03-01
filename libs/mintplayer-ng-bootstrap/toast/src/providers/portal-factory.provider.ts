import { ComponentPortal } from "@angular/cdk/portal";
import { EnvironmentProviders, InjectionToken, Injector, makeEnvironmentProviders } from "@angular/core";
import { BsToastContainerComponent } from "../components/toast-container/toast-container.component";

export const PORTAL_FACTORY = new InjectionToken<(injector: Injector) => ComponentPortal<any>>('ToastPortalFactory', {
  providedIn: 'root',
  factory: () => (injector: Injector) => new ComponentPortal(BsToastContainerComponent, null, injector),
});

export function provideToast(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: PORTAL_FACTORY,
      useValue: (injector: Injector) => {
        return new ComponentPortal(BsToastContainerComponent, null, injector);
      }
    },
  ]);
}