import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentFactoryResolver, Injectable, Injector, TemplateRef } from '@angular/core';
import { ModalAnimationMeta } from '../interfaces/modal-animation-meta';
import { BsModalComponent } from '../component/modal.component';
import { MODAL_CONTENT } from '../providers/modal-content.provider';
import { filter, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BsModalService {

  constructor(
    private overlay: Overlay,
    private parentInjector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver,
  ) { }

  public show(template: TemplateRef<any>) {
    const injector = Injector.create({
      providers: [{ provide: MODAL_CONTENT, useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsModalComponent, null, injector, this.componentFactoryResolver);

    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      hasBackdrop: true
    });

    const componentInstance = overlayRef.attach<BsModalComponent>(portal);
    
    componentInstance.instance['instance'] = <ModalAnimationMeta>{
      component: componentInstance,
      overlay: overlayRef
    };

    return componentInstance.instance;
  }

  public hide(modal: BsModalComponent) {
    modal.animationStateChanged.pipe(
      filter(ev => ev.phaseName === 'done' && ev.toState === 'void'),
      take(1)
    ).subscribe(() => {
      modal['instance']?.overlay.dispose()
    });

    modal.animationState = 'void';
  }

}
