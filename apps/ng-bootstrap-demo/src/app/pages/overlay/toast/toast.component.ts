import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsToastModule, BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  standalone: true,
  imports: [FormsModule, FocusOnLoadDirective, BsFormModule, BsToastModule, BsCloseComponent, BsInputGroupComponent, BsButtonTypeDirective]
})
export class ToastComponent {

  toastService = inject(BsToastService);

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
