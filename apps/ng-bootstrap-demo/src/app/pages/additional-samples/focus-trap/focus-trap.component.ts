import { Component, TemplateRef } from '@angular/core';
import { BsModalContentComponent, BsModalService } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-focus-trap',
  templateUrl: './focus-trap.component.html',
  styleUrls: ['./focus-trap.component.scss']
})
export class FocusTrapComponent {

  constructor(private modalService: BsModalService) {
  }

  modal: BsModalContentComponent | null = null;

  editAddress(modalTemplate: TemplateRef<any>) {
    this.modal = this.modalService.show(modalTemplate)
  }
  hideModal(modal: BsModalContentComponent) {
    if (modal) {
      this.modalService.hide(modal);
    }
  }

}
