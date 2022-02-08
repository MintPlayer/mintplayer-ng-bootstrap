import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, Injector, TemplateRef } from '@angular/core';
import { BsOffcanvasModule } from '../../offcanvas.module';
import { BsOffcanvasComponent } from '../../components/offcanvas/offcanvas.component';
import { OffcanvasAnimationMeta } from '../../interfaces/offcanvas-animation-meta';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Injectable({
  providedIn: BsOffcanvasModule
})
export class BsOffcanvasService {

  constructor(
    private overlay: Overlay,
    private parentInjector: Injector,
  ) { }

  public show(template: TemplateRef<any>, position: 'top' | 'bottom' | 'start' | 'end', hasBackdrop = false, backdropClick: ((offcanvas: BsOffcanvasComponent) => void) | null = null) {
    const injector = Injector.create({
      providers: [{ provide: OFFCANVAS_CONTENT, useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsOffcanvasComponent, null, injector);
  
    const positioning = this.overlay.position().global();
    const config: OverlayConfig = {
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: positioning,
      hasBackdrop,
    };

    switch (position) {
      case 'bottom':
        positioning.centerHorizontally().bottom('0');
        config.width = '100%';
        break;
      case 'top':
        positioning.centerHorizontally().top('0');
        config.width = '100%';
        break;
      case 'start':
        positioning.centerVertically().left('0');
        config.height = '100%';
        break;
      case 'end':
        positioning.centerVertically().right('0');
        config.height = '100%';
        break;
          
      default:
        throw 'Invalid value for position';
    }

    const overlayRef = this.overlay.create(config);
  
    const componentInstance = overlayRef.attach<BsOffcanvasComponent>(portal);
    componentInstance.instance.position = position;
    setTimeout(() => componentInstance.instance.show = true);
    
    componentInstance.instance['instance'] = <OffcanvasAnimationMeta>{
      component: componentInstance,
      overlay: overlayRef
    };

    if (hasBackdrop && backdropClick) {
      overlayRef.backdropClick().subscribe(() => backdropClick(componentInstance.instance));
    }

    return componentInstance.instance;
  }

  public hide(offcanvas: BsOffcanvasComponent) {
    offcanvas.show = false;
    setTimeout(() => offcanvas['instance']?.overlay.dispose(), 300);
  }

}
