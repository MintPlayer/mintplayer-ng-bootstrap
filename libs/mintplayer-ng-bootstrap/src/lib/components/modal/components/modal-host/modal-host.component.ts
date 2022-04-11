import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, EventEmitter, Injector, Input, Output, TemplateRef } from '@angular/core';
import { BsModalComponent } from '../modal/modal.component';
import { MODAL_BODY } from '../../providers/modal-body.provider';
import { MODAL_FOOTER } from '../../providers/modal-footer.provider';
import { MODAL_HEADER } from '../../providers/modal-header.provider';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss']
})
export class BsModalHostComponent implements AfterViewInit {

  constructor(private overlay: Overlay, private parentInjector: Injector, private componentFactoryResolver: ComponentFactoryResolver) { }

  componentInstance?: ComponentRef<BsModalComponent>;
  header!: TemplateRef<any>;
  body!: TemplateRef<any>;
  footer!: TemplateRef<any>;

  ngAfterViewInit() {
    const injector = Injector.create({
      providers: [
        { provide: MODAL_HEADER, useValue: this.header },
        { provide: MODAL_BODY, useValue: this.body },
        { provide: MODAL_FOOTER, useValue: this.footer },  
      ],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsModalComponent, null, injector, this.componentFactoryResolver);
    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      width: '100%',
      hasBackdrop: false
    });
    this.componentInstance = overlayRef.attach<BsModalComponent>(portal);
    this.componentInstance.instance.isOpen = this._isOpen;
  }

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

}
