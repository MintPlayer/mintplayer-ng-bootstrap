import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentFactoryResolver, Injectable, Injector, TemplateRef } from '@angular/core';
import { filter, take } from 'rxjs';
import { BsModalModule } from '../modal.module';
import { BsModalContentComponent } from '../component/modal-content/modal-content.component';
import { ModalAnimationMeta } from '../interfaces';
import { MODAL_CONTENT } from '../providers/modal-content.provider';

@Injectable({
  providedIn: BsModalModule
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
    const portal = new ComponentPortal(BsModalContentComponent, null, injector, this.componentFactoryResolver);

    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      width: '100%',
      hasBackdrop: true
    });

    const componentInstance = overlayRef.attach<BsModalContentComponent>(portal);
    componentInstance.instance['instance'] = <ModalAnimationMeta>{
      component: componentInstance,
      overlay: overlayRef
    };

    return componentInstance.instance;
  }

  public hide(modal: BsModalContentComponent) {
    modal.animationStateChanged.pipe(
      filter(ev => ev.phaseName === 'done' && ev.toState === 'void'),
      take(1)
    ).subscribe(() => {
      modal['instance']?.overlay.dispose()
    });

    modal.animationState = 'void';
  }

}
