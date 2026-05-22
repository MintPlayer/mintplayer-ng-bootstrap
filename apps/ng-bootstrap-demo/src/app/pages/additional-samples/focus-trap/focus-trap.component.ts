import { A11yModule } from '@angular/cdk/a11y';
import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormComponent, BsFormControlDirective, BsFormGroupDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-focus-trap',
  templateUrl: './focus-trap.component.html',
  styleUrls: ['./focus-trap.component.scss'],
  imports: [A11yModule, BsForDirective, BsFormComponent, BsFormControlDirective, BsFormGroupDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective, BsCloseComponent, BsCodeSnippetComponent, BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective, BsButtonTypeDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusTrapComponent {

  isOpen = false;
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button (click)="isOpen = true" [color]="colors.primary">Open dialog</button>

    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal cdkTrapFocus>
        <div bsModalHeader>
          <h5 class="modal-title">Edit details</h5>
        </div>
        <div bsModalBody>
          <input type="text" placeholder="First field is auto-focused" autofocus>
          <input type="text" placeholder="Tab stays inside the dialog">
        </div>
        <div bsModalFooter>
          <button type="button" bsModalClose [color]="colors.secondary">Close</button>
        </div>
      </div>
    </bs-modal>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { A11yModule } from '@angular/cdk/a11y';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import {
      BsModalHostComponent,
      BsModalDirective,
      BsModalHeaderDirective,
      BsModalBodyDirective,
      BsModalFooterDirective,
      BsModalCloseDirective,
    } from '@mintplayer/ng-bootstrap/modal';

    @Component({
      selector: 'my-focus-trap-demo',
      templateUrl: './my-focus-trap-demo.component.html',
      imports: [
        A11yModule,
        BsButtonTypeDirective,
        BsModalHostComponent,
        BsModalDirective,
        BsModalHeaderDirective,
        BsModalBodyDirective,
        BsModalFooterDirective,
        BsModalCloseDirective,
      ],
    })
    export class MyFocusTrapDemoComponent {
      protected readonly colors = Color;
      protected isOpen = false;
    }
  `;
}
