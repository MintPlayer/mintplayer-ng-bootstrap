import { Component, DestroyRef, ElementRef, inject, model, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsToastBodyComponent, BsToastComponent, BsToasterComponent, BsToasterToastDirective, BsToastHeaderComponent } from '@mintplayer/ng-bootstrap/toast';
import { ToastQueue } from '@mintplayer/ui-core/toast';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    FormsModule,
    FocusOnLoadDirective,
    BsFormComponent,
    BsFormControlDirective,
    BsToasterComponent,
    BsToasterToastDirective,
    BsToastComponent,
    BsToastHeaderComponent,
    BsToastBodyComponent,
    BsInputGroupComponent,
    BsButtonTypeDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  colors = Color;
  itemToAdd = model('');
  readonly txtItem = viewChild.required<ElementRef<HTMLInputElement>>('txtItem');
  readonly toasts = new ToastQueue<{ message: string }>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.toasts.destroy());
  }

  addToast(message: string) {
    this.toasts.push({ message: message || 'Hello, world!' });
    this.itemToAdd.set('');
    this.txtItem()?.nativeElement.focus();
  }

  protected readonly snippetBasicHtml = dedent`
    <button type="button" [color]="colors.primary" (click)="toasts.push({ message: 'Saved!' })">
      Show toast
    </button>

    <bs-toaster [queue]="toasts">
      <ng-template bsToasterToast let-toast="toast">
        <bs-toast [visible]="toast.visible" (visibleChange)="toasts.close(toast.id)">
          <bs-toast-header>
            <strong class="me-auto">Notification</strong>
          </bs-toast-header>
          <bs-toast-body>{{ toast.data.message }}</bs-toast-body>
        </bs-toast>
      </ng-template>
    </bs-toaster>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, DestroyRef, inject } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import {
      BsToastBodyComponent,
      BsToastComponent,
      BsToasterComponent,
      BsToasterToastDirective,
      BsToastHeaderComponent,
    } from '@mintplayer/ng-bootstrap/toast';
    import { ToastQueue } from '@mintplayer/ui-core/toast';

    @Component({
      selector: 'my-toast-demo',
      templateUrl: './my-toast-demo.component.html',
      imports: [
        BsToasterComponent,
        BsToasterToastDirective,
        BsToastComponent,
        BsToastHeaderComponent,
        BsToastBodyComponent,
        BsButtonTypeDirective,
      ],
    })
    export class MyToastDemoComponent {
      protected readonly colors = Color;
      // Provide it from a service to toast from anywhere in the app.
      readonly toasts = new ToastQueue<{ message: string }>();

      constructor() {
        inject(DestroyRef).onDestroy(() => this.toasts.destroy());
      }
    }
  `;
}
