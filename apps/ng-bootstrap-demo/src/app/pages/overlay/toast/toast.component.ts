import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { BsToastService } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent {

  constructor(private toastService: BsToastService) { }

  myCounter = 0;
  itemToAdd = '';
  @ViewChild('txtItem') txtItem!: ElementRef<HTMLInputElement>;

  addToast(template: TemplateRef<any>, message: string) {
    this.toastService.pushToast(template, { message });
    this.itemToAdd = '';
    this.txtItem?.nativeElement.focus();
  }

}
