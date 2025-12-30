import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, effect, HostListener, inject, Injector, input, model, OnDestroy, TemplateRef } from '@angular/core';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsModalHostComponent implements AfterViewInit, OnDestroy {
  private overlay = inject(Overlay);
  private parentInjector = inject(Injector);
  private portalFactory = inject<(injector: Injector) => ComponentPortal<BsModalComponent>>(PORTAL_FACTORY);

  overlayRef!: OverlayRef;
  componentInstance?: ComponentRef<BsModalComponent>;
  template!: TemplateRef<any>;

  isOpen = model(false);
  closeOnEscape = input(true);

  constructor() {
    effect(() => {
      const value = this.isOpen();
      if (this.componentInstance) {
        this.componentInstance.instance.isOpen.set(value);
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
    const portal = this.portalFactory(injector);
    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      width: '100%',
      hasBackdrop: false
    });
    this.componentInstance = this.overlayRef.attach<BsModalComponent>(portal);
    this.componentInstance.instance.isOpen.set(this.isOpen());
  }

  ngOnDestroy() {
    this.isOpen.set(false);
    setTimeout(() => this.overlayRef && this.overlayRef.dispose(), 500);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: Event) {
    const ev = event as KeyboardEvent;
    if (this.isOpen() && this.closeOnEscape() && ev.code === 'Escape') {
      this.isOpen.set(false);
    }
  }
}