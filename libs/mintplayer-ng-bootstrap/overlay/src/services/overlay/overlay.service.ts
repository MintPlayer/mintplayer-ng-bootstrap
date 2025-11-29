import { Overlay, OverlayRef, PositionStrategy, ScrollStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { ComponentRef, EmbeddedViewRef, inject, Injectable, Injector, TemplateRef } from '@angular/core';
import { ConnectedOverlayConfig, GlobalOverlayConfig, ScrollStrategyType } from '../../interfaces';
import { OverlayHandle } from '../../interfaces/overlay-handle.interface';

@Injectable({
  providedIn: 'root'
})
export class BsOverlayService {
  private overlay = inject(Overlay);
  private injector = inject(Injector);

  createGlobal<T>(config: GlobalOverlayConfig<T>): OverlayHandle<T> {
    const positionStrategy = this.buildGlobalPositionStrategy(config);
    const scrollStrategy = this.buildScrollStrategy(config.scrollStrategy);

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy,
      hasBackdrop: config.hasBackdrop ?? false,
      width: config.width,
    });

    const componentRef = this.attachComponentPortal<T>(
      overlayRef,
      config.contentComponent,
      config.contentToken,
      config.template
    );

    return this.createHandle(overlayRef, componentRef, undefined, config.cleanupDelay);
  }

  createConnected<T>(config: ConnectedOverlayConfig<T>): OverlayHandle<T> {
    const positionStrategy = this.buildConnectedPositionStrategy(config);
    const scrollStrategy = this.buildScrollStrategy(config.scrollStrategy);

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy,
      hasBackdrop: config.hasBackdrop ?? false,
    });

    let componentRef: ComponentRef<T> | undefined;
    let viewRef: EmbeddedViewRef<any> | undefined;

    if (config.portalType === 'template') {
      viewRef = this.attachTemplatePortal(overlayRef, config.template, config.viewContainerRef!);
    } else if (config.contentComponent && config.contentToken) {
      componentRef = this.attachComponentPortal<T>(
        overlayRef,
        config.contentComponent,
        config.contentToken,
        config.template
      );
    }

    return this.createHandle(overlayRef, componentRef, viewRef);
  }

  private attachComponentPortal<T>(
    overlayRef: OverlayRef,
    contentComponent: any,
    contentToken: any,
    template: TemplateRef<any>
  ): ComponentRef<T> {
    const injector = Injector.create({
      providers: [{ provide: contentToken, useValue: template }],
      parent: this.injector
    });
    const portal = new ComponentPortal<T>(contentComponent, null, injector);
    return overlayRef.attach(portal);
  }

  private attachTemplatePortal(
    overlayRef: OverlayRef,
    template: TemplateRef<any>,
    viewContainerRef: any
  ): EmbeddedViewRef<any> {
    const portal = new TemplatePortal(template, viewContainerRef);
    return overlayRef.attach(portal);
  }

  private buildGlobalPositionStrategy(config: GlobalOverlayConfig<any>): PositionStrategy {
    const pos = config.globalPosition ?? {};
    let strategy = this.overlay.position().global();

    if (pos.centerHorizontally) {
      strategy = strategy.centerHorizontally();
    }
    if (pos.centerVertically) {
      strategy = strategy.centerVertically();
    }
    if (pos.top !== undefined) {
      strategy = strategy.top(pos.top);
    }
    if (pos.bottom !== undefined) {
      strategy = strategy.bottom(pos.bottom);
    }
    if (pos.left !== undefined) {
      strategy = strategy.left(pos.left);
    }
    if (pos.right !== undefined) {
      strategy = strategy.right(pos.right);
    }

    return strategy;
  }

  private buildConnectedPositionStrategy(config: ConnectedOverlayConfig<any>): PositionStrategy {
    return this.overlay.position()
      .flexibleConnectedTo(config.connectedTo as any)
      .withPositions(config.positions);
  }

  private buildScrollStrategy(type?: ScrollStrategyType): ScrollStrategy {
    switch (type) {
      case 'block':
        return this.overlay.scrollStrategies.block();
      case 'close':
        return this.overlay.scrollStrategies.close();
      case 'noop':
        return this.overlay.scrollStrategies.noop();
      case 'reposition':
      default:
        return this.overlay.scrollStrategies.reposition();
    }
  }

  private createHandle<T>(
    overlayRef: OverlayRef,
    componentRef?: ComponentRef<T>,
    viewRef?: EmbeddedViewRef<any>,
    cleanupDelay: number = 0
  ): OverlayHandle<T> {
    return {
      overlayRef,
      componentRef,
      viewRef,
      dispose: () => {
        const doDispose = () => {
          overlayRef.detach();
          overlayRef.dispose();
        };
        if (cleanupDelay > 0) {
          setTimeout(doDispose, cleanupDelay);
        } else {
          doDispose();
        }
      },
      updatePosition: () => {
        overlayRef.updatePosition();
      }
    };
  }
}
