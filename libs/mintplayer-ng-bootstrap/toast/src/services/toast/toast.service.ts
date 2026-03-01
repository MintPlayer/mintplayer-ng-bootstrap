import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Injectable, Injector, signal, TemplateRef } from '@angular/core';
import { BsToastContainerComponent } from '../../components/toast-container/toast-container.component';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

@Injectable({ providedIn: 'root' })
export class BsToastService {

  private overlayService = inject(Overlay);
  private rootInjector = inject(Injector);
  private portalFactory = inject<(injector: Injector) => ComponentPortal<any>>(PORTAL_FACTORY);

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
    const item: ToastItem = { template: toast, context: ctx };
    this.toasts.update(toasts => [...toasts, item]);
    setTimeout(() => {
      this.toasts.update(toasts => toasts.map(t =>
        t === item ? { ...t, context: Object.assign({}, t.context, { isVisible: true }) } : t
      ));
    }, 20);
  }

  public close(index: number) {
    this.toasts.update(toasts => toasts.map((t, i) =>
      i === index ? { ...t, context: Object.assign({}, t.context, { isVisible: false }) } : t
    ));

    setTimeout(() => {
      this.toasts.update(toasts => toasts.filter((_, i) => i !== index));
    }, 400);
  }
}

interface ToastItem {
  template: TemplateRef<any>;
  context: Object | null;
}
