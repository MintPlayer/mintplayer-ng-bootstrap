import { filter, take } from 'rxjs';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentFactoryResolver, forwardRef, Injectable, Injector, TemplateRef } from '@angular/core';
import { ModalAnimationMeta } from '../interfaces/modal-animation-meta';
import { MODAL_CONTENT } from '../providers/modal-content.provider';
import { BsModalPresenterComponent } from '../component/modal-presenter/modal-presenter.component';
import { BsModalComponent } from '../component/modal/modal.component';

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
      providers: [
        { provide: MODAL_CONTENT, useValue: template },
        // { provide: BsModalPresenterComponent, useExisting: BsModalPresenterComponent },
      ],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsModalPresenterComponent, null, injector, this.componentFactoryResolver);

    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      hasBackdrop: true
    });

    const componentInstance = overlayRef.attach<BsModalPresenterComponent>(portal);
    console.log('instance', componentInstance);
    
    componentInstance.instance['instance'] = <ModalAnimationMeta>{
      component: componentInstance,
      overlay: overlayRef
    };

    return componentInstance.instance;
  }

  public hide(modal: BsModalPresenterComponent) {
    modal.animationStateChanged.pipe(
      filter(ev => ev.phaseName === 'done' && ev.toState === 'void'),
      take(1)
    ).subscribe(() => {
      modal['instance']?.overlay.dispose()
    });

    modal.animationState = 'void';
  }

}
