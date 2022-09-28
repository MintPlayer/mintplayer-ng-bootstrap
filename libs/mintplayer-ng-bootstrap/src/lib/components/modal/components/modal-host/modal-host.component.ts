import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, EventEmitter, HostListener, Inject, Injector, Input, OnDestroy, Output, TemplateRef } from '@angular/core';
import { Subject, take } from 'rxjs';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss']
})
export class BsModalHostComponent implements AfterViewInit, OnDestroy {

  constructor(private overlay: Overlay, private parentInjector: Injector, @Inject(PORTAL_FACTORY) private portalFactory: (injector: Injector) => ComponentPortal<BsModalComponent>, private componentFactoryResolver: ComponentFactoryResolver) {
    this.destroyed$.pipe(take(1))
      .subscribe(() => {
        this.isOpen = false;
        setTimeout(() => this.overlayRef && this.overlayRef.dispose(), 500);
      });
  }

  overlayRef!: OverlayRef;
  componentInstance?: ComponentRef<BsModalComponent>;
  template!: TemplateRef<any>;
  destroyed$ = new Subject();

  //#region isOpen
  private _isOpen = false;
  get isOpen() {
    return this._isOpen;
  }
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (this.componentInstance) {
      this.componentInstance.instance.isOpen = value;
    }
    this.isOpenChange.emit(value);
  }
  @Output() isOpenChange = new EventEmitter<boolean>();
  //#endregion
  @Input() closeOnEscape = true;

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
    this.componentInstance.instance.isOpen = this._isOpen;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  
  @HostListener('document:keydown', ['$event'])
  private onKeyDown(ev: KeyboardEvent) {
    if (this.isOpen && this.closeOnEscape && ev.code === 'Escape') {
      this.isOpen = false;
    }
  }
}