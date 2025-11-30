import { Component, ComponentRef, EventEmitter, HostListener, Input, Output, TemplateRef } from '@angular/core';
import { GlobalPositionConfig } from '@mintplayer/ng-bootstrap/overlay';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss'],
  standalone: false,
})
export class BsModalHostComponent {
  template!: TemplateRef<any>;
  private componentRef: ComponentRef<BsModalComponent> | null = null;

  // Expose for template binding
  readonly contentComponent = BsModalComponent;
  readonly contentToken = MODAL_CONTENT;
  readonly globalPosition: GlobalPositionConfig = {
    centerHorizontally: true,
    top: '0',
    bottom: '0',
    left: '0',
    right: '0'
  };

  //#region isOpen
  private _isOpen = false;
  get isOpen() {
    return this._isOpen;
  }
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (this.componentRef) {
      this.componentRef.instance.isOpen = value;
      this.componentRef.changeDetectorRef.detectChanges();
    }
    this.isOpenChange.emit(value);
  }
  @Output() isOpenChange = new EventEmitter<boolean>();
  //#endregion

  @Input() closeOnEscape = true;

  onAttached(ref: ComponentRef<BsModalComponent>) {
    this.componentRef = ref;
    this.componentRef.instance.isOpen = this._isOpen;
    this.componentRef.changeDetectorRef.detectChanges();
  }

  @HostListener('document:keydown', ['$event'])
  private onKeyDown(ev: KeyboardEvent) {
    if (this.isOpen && this.closeOnEscape && ev.code === 'Escape') {
      this.isOpen = false;
    }
  }
}
