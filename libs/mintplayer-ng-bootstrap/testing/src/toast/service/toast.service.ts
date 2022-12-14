import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Inject, Injectable, Injector, TemplateRef } from '@angular/core';
import { BsToastMockComponent } from '../components/toast/toast.component';
import { PORTAL_FACTORY } from '../providers/portal-factory.provider';

@Injectable()
export class BsToastMockService {
  constructor(private overlayService: Overlay, private rootInjector: Injector, @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<BsToastMockComponent>) { }

  public pushToast(toast: TemplateRef<any>) {
    const portal = this.portalFactory(this.rootInjector);
    const overlayRef = this.overlayService.create({});
    const component = overlayRef.attach<BsToastMockComponent>(portal);
  }
}
