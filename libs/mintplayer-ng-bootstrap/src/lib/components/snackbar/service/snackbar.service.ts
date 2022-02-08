import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, Injector, TemplateRef } from '@angular/core';
import { filter, take } from 'rxjs';
import { BsSnackbarModule } from '../snackbar.module';
import { BsSnackbarComponent } from '../component/snackbar.component';
import { SnackbarAnimationMeta } from '../interfaces/snackbar-animation-meta';
import { SNACKBAR_CONTENT } from '../providers/snackbar-content.provider';

@Injectable({
  providedIn: BsSnackbarModule
})
export class BsSnackbarService {

  constructor(
    private overlay: Overlay,
    private parentInjector: Injector,
  ) { }

  public show(template: TemplateRef<any>) {
    const injector = Injector.create({
      providers: [{ provide: SNACKBAR_CONTENT, useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsSnackbarComponent, null, injector);

    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0'),
      width: '100%'
    });

    const componentInstance = overlayRef.attach<BsSnackbarComponent>(portal);
    
    componentInstance.instance['instance'] = <SnackbarAnimationMeta>{
      component: componentInstance,
      overlay: overlayRef
    };

    return componentInstance.instance;
  }

  public hide(snackbar: BsSnackbarComponent) {
    snackbar.animationStateChanged.pipe(
      filter(ev => ev.phaseName === 'done' && ev.toState === 'void'),
      take(1)
    ).subscribe(() => {
      snackbar['instance']?.overlay.dispose()
    });

    snackbar.animationState = 'void';
  }

}
