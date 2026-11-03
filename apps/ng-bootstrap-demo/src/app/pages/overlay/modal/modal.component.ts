import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsColFormLabelDirective, BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalComponent, BsModalFooterDirective, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  imports: [BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective, BsModalComponent, BsModalHeaderDirective, BsModalFooterDirective, BsButtonTypeDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  gitRepo = inject(GIT_REPO);

  readonly isOpen = signal(false);
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="isOpen.set(true)">Open modal</button>

    <bs-modal [(open)]="isOpen">
      <span *bsModalHeader>Modal title</span>
      Place any content here — forms, lists, embedded components.
      <ng-template bsModalFooter>
        <button type="button" data-bs-dismiss="modal" [color]="colors.secondary">Close</button>
      </ng-template>
    </bs-modal>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsModalComponent, BsModalFooterDirective, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

    @Component({
      selector: 'my-modal-demo',
      templateUrl: './my-modal-demo.component.html',
      imports: [BsModalComponent, BsModalHeaderDirective, BsModalFooterDirective, BsButtonTypeDirective],
    })
    export class MyModalDemoComponent {
      protected readonly colors = Color;
      protected readonly isOpen = signal(false);
    }
  `;
}
