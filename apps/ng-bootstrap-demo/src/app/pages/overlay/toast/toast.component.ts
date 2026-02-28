import { Component, ElementRef, inject, signal, TemplateRef, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsToastComponent, BsToastBodyComponent, BsToastHeaderComponent, BsToastCloseDirective, BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  imports: [FormsModule, FocusOnLoadDirective, BsFormComponent, BsFormControlDirective, BsToastComponent, BsToastBodyComponent, BsToastHeaderComponent, BsToastCloseDirective, BsCloseComponent, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private toastService = inject(BsToastService);

  colors = Color;
  myCounter = signal(0);
  itemToAdd = signal('');
  readonly txtItem = viewChild.required<ElementRef<HTMLInputElement>>('txtItem');

  addToast(template: TemplateRef<any>, message: string) {
    this.toastService.pushToast(template, { message });
    this.itemToAdd.set('');
    this.txtItem()?.nativeElement.focus();
  }

}
