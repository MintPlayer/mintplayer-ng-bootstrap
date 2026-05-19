import { Component, ElementRef, inject, model, signal, TemplateRef, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsToastComponent, BsToastBodyComponent, BsToastHeaderComponent, BsToastCloseDirective, BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  imports: [BsCodeSnippetComponent, FormsModule, FocusOnLoadDirective, BsFormComponent, BsFormControlDirective, BsToastComponent, BsToastBodyComponent, BsToastHeaderComponent, BsToastCloseDirective, BsCloseComponent, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private toastService = inject(BsToastService);

  colors = Color;
  myCounter = signal(0);
  itemToAdd = model('');
  readonly txtItem = viewChild.required<ElementRef<HTMLInputElement>>('txtItem');

  addToast(template: TemplateRef<any>, message: string) {
    this.toastService.pushToast(template, { message });
    this.itemToAdd.set('');
    this.txtItem()?.nativeElement.focus();
  }

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="addToast(toastTemplate, 'Saved!')">
      Show toast
    </button>

    <ng-template #toastTemplate let-message="message" let-index="toastIndex" let-isVisible="isVisible">
      <bs-toast [isVisible]="isVisible">
        <bs-toast-header>
          <strong class="me-auto">Notification</strong>
          <bs-close [index]="index"></bs-close>
        </bs-toast-header>
        <bs-toast-body>{{ message }}</bs-toast-body>
      </bs-toast>
    </ng-template>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, TemplateRef, inject } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
    import {
      BsToastComponent,
      BsToastBodyComponent,
      BsToastHeaderComponent,
      BsToastService,
    } from '@mintplayer/ng-bootstrap/toast';

    @Component({
      selector: 'my-toast-demo',
      templateUrl: './my-toast-demo.component.html',
      imports: [
        BsToastComponent,
        BsToastBodyComponent,
        BsToastHeaderComponent,
        BsCloseComponent,
        BsButtonTypeDirective,
      ],
    })
    export class MyToastDemoComponent {
      private toastService = inject(BsToastService);
      protected readonly colors = Color;

      addToast(template: TemplateRef<any>, message: string) {
        this.toastService.pushToast(template, { message });
      }
    }
  `;
}
