import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective, BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective, BsButtonTypeDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  gitRepo = inject(GIT_REPO);

  isOpen = false;
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="isOpen = true">Open modal</button>

    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader>
          <h5 class="modal-title">Modal title</h5>
        </div>
        <div bsModalBody>
          Place any content here — forms, lists, embedded components.
        </div>
        <div bsModalFooter>
          <button type="button" bsModalClose [color]="colors.secondary">Close</button>
        </div>
      </div>
    </bs-modal>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import {
      BsModalHostComponent,
      BsModalDirective,
      BsModalHeaderDirective,
      BsModalBodyDirective,
      BsModalFooterDirective,
      BsModalCloseDirective,
    } from '@mintplayer/ng-bootstrap/modal';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

    @Component({
      selector: 'my-modal-demo',
      templateUrl: './my-modal-demo.component.html',
      imports: [
        BsModalHostComponent,
        BsModalDirective,
        BsModalHeaderDirective,
        BsModalBodyDirective,
        BsModalFooterDirective,
        BsModalCloseDirective,
        BsButtonTypeDirective,
      ],
    })
    export class MyModalDemoComponent {
      protected readonly colors = Color;
      protected isOpen = false;
    }
  `;
}
