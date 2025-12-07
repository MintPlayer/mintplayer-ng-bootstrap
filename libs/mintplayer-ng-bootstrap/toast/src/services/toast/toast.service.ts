import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Inject, Injectable, Injector, TemplateRef, signal } from '@angular/core';
import { BsToastContainerComponent } from '../../components/toast-container/toast-container.component';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

@Injectable()
export class BsToastService {

  constructor(private overlayService: Overlay, private rootInjector: Injector, @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<any>) { }

  overlayRef: OverlayRef | null = null;
  toasts = signal<ToastItem[]>([]);
  public pushToast(toast: TemplateRef<any>, context?: Object) {
    if (!this.overlayRef) {
      const injector = Injector.create({
        providers: [],
        parent: this.rootInjector,
      });
      const portal = this.portalFactory(injector);
      this.overlayRef = this.overlayService.create({
        scrollStrategy: this.overlayService.scrollStrategies.block(),
        positionStrategy: this.overlayService.position().global()
          .top('0').left('0').bottom('0').right('0'),
        hasBackdrop: false
      });
      const component = this.overlayRef.attach<BsToastContainerComponent>(portal);
    }

    context = context ?? {};
    const ctx = Object.assign(context, { isVisible: false });
    const currentToasts = this.toasts();
    currentToasts.push({ template: toast, context: ctx });
    this.toasts.set([...currentToasts]);
    setTimeout(() => ctx.isVisible = true, 20);
  }

  public close(index: number) {
    const toasts = this.toasts();
    const toast = toasts[index];
    if (toast && toast.context) {
      (<any>toast.context).isVisible = false;
    }

    setTimeout(() => {
      const currentToasts = this.toasts();
      currentToasts.splice(index, 1);
      this.toasts.set([...currentToasts]);
    }, 400);
  }
}

interface ToastItem {
  template: TemplateRef<any>;
  context: Object | null;
}
