import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsToastService } from '@mintplayer/ng-bootstrap/toast';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent {

  constructor(private toastService: BsToastService) { }

  colors = Color;
  myCounter = 0;
  itemToAdd = '';
  @ViewChild('txtItem') txtItem!: ElementRef<HTMLInputElement>;

  addToast(template: TemplateRef<any>, message: string) {
    this.toastService.pushToast(template, { message });
    this.itemToAdd = '';
    this.txtItem?.nativeElement.focus();
  }

}
