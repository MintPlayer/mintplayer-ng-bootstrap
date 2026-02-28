import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, effect, inject, Injector, input, model, OnDestroy, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss'],
  standalone: true,
  imports: [BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: PORTAL_FACTORY,
    useValue: (injector: Injector) => {
      return new ComponentPortal(BsModalComponent, null, injector);
    }
  }],
  host: {
    '(document:keydown)': 'onKeyDown($event)',
  },
})
export class BsModalHostComponent implements AfterViewInit, OnDestroy {
  private overlay = inject(Overlay);
  private parentInjector = inject(Injector);
  private portalFactory = inject<(injector: Injector) => ComponentPortal<BsModalComponent>>(PORTAL_FACTORY);
  private componentFactoryResolver = inject(ComponentFactoryResolver);

  overlayRef!: OverlayRef;
  componentInstance?: ComponentRef<BsModalComponent>;
  template!: TemplateRef<any>;

  //#region isOpen
  readonly isOpen = model<boolean>(false);
  //#endregion
  readonly closeOnEscape = input(true);

  constructor() {
    effect(() => {
      const value = this.isOpen();
      if (this.componentInstance) {
        this.componentInstance.instance.isOpen = value;
        this.componentInstance.changeDetectorRef.detectChanges();
      }
    });
  }

  ngAfterViewInit() {
    const injector = Injector.create({
      providers: [
        { provide: MODAL_CONTENT, useValue: this.template }
      ],
      parent: this.parentInjector
    });
    // const portal = new ComponentPortal(BsModalComponent, null, injector, this.componentFactoryResolver);
    const portal = this.portalFactory(injector);
    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      width: '100%',
      hasBackdrop: false
    });
    this.componentInstance = this.overlayRef.attach<BsModalComponent>(portal);
    this.componentInstance.instance.isOpen = this.isOpen();
    this.componentInstance.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    this.isOpen.set(false);
    setTimeout(() => this.overlayRef && this.overlayRef.dispose(), 500);
  }

  onKeyDown(event: Event) {
    const ev = event as KeyboardEvent;
    if (this.isOpen() && this.closeOnEscape() && ev.code === 'Escape') {
      this.isOpen.set(false);
    }
  }
}