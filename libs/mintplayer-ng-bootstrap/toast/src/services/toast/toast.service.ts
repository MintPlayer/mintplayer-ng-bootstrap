import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsToastContainerComponent } from '../../components/toast-container/toast-container.component';

@Injectable()
export class BsToastService {
  private overlay = inject(Overlay);

  overlayRef: OverlayRef | null = null;
  toasts$ = new BehaviorSubject<ToastItem[]>([]);

  public pushToast(toast: TemplateRef<any>, context?: Object) {
    if (!this.overlayRef) {
      const portal = new ComponentPortal(BsToastContainerComponent);
      this.overlayRef = this.overlay.create({
        scrollStrategy: this.overlay.scrollStrategies.block(),
        positionStrategy: this.overlay.position().global()
          .top('0').left('0').bottom('0').right('0'),
        hasBackdrop: false
      });
      this.overlayRef.attach(portal);
    }

    context = context ?? {};
    const ctx = Object.assign(context, { isVisible: false });
    this.toasts$.value.push({ template: toast, context: ctx });
    this.toasts$.next(this.toasts$.value);
    setTimeout(() => ctx.isVisible = true, 20);
  }

  public close(index: number) {
    const toasts = this.toasts$.value;
    const toast = toasts[index];
    if (toast && toast.context) {
      (<any>toast.context).isVisible = false;
    }

    setTimeout(() => {
      toasts.splice(index, 1);
      this.toasts$.next(this.toasts$.value);
    }, 400);
  }
}

interface ToastItem {
  template: TemplateRef<any>;
  context: Object | null;
}
