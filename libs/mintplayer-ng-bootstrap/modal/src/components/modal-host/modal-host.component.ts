import { AfterViewInit, Component, ComponentRef, EventEmitter, HostListener, inject, Input, OnDestroy, Output, TemplateRef } from '@angular/core';
import { BsOverlayService, OverlayHandle } from '@mintplayer/ng-bootstrap/overlay';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss'],
  standalone: false,
})
export class BsModalHostComponent implements AfterViewInit, OnDestroy {
  private overlayService = inject(BsOverlayService);

  private handle: OverlayHandle<BsModalComponent> | null = null;
  template!: TemplateRef<any>;

  //#region isOpen
  private _isOpen = false;
  get isOpen() {
    return this._isOpen;
  }
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (this.handle?.componentRef) {
      this.handle.componentRef.instance.isOpen = value;
      this.handle.componentRef.changeDetectorRef.detectChanges();
    }
    this.isOpenChange.emit(value);
  }
  @Output() isOpenChange = new EventEmitter<boolean>();
  //#endregion
  @Input() closeOnEscape = true;

  ngAfterViewInit() {
    this.handle = this.overlayService.createGlobal<BsModalComponent>({
      contentComponent: BsModalComponent,
      contentToken: MODAL_CONTENT,
      template: this.template,
      globalPosition: {
        centerHorizontally: true,
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      scrollStrategy: 'reposition',
      hasBackdrop: false,
      width: '100%',
      cleanupDelay: 500,
    });

    if (this.handle.componentRef) {
      this.handle.componentRef.instance.isOpen = this._isOpen;
      this.handle.componentRef.changeDetectorRef.detectChanges();
    }
  }

  ngOnDestroy() {
    this.isOpen = false;
    this.handle?.dispose();
  }

  @HostListener('document:keydown', ['$event'])
  private onKeyDown(ev: KeyboardEvent) {
    if (this.isOpen && this.closeOnEscape && ev.code === 'Escape') {
      this.isOpen = false;
    }
  }
}
