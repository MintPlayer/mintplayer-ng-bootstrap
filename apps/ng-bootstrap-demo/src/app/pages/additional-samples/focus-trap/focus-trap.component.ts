import { A11yModule } from '@angular/cdk/a11y';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsColFormLabelDirective, BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalComponent, BsModalFooterDirective, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-focus-trap',
  templateUrl: './focus-trap.component.html',
  styleUrls: ['./focus-trap.component.scss'],
  imports: [A11yModule, BsForDirective, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective, BsCloseComponent, BsCodeSnippetComponent, BsModalComponent, BsModalHeaderDirective, BsModalFooterDirective, BsButtonTypeDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusTrapComponent {
  readonly isOpen = signal(false);
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button (click)="isOpen.set(true)" [color]="colors.primary">Open dialog</button>

    <!-- The modal traps focus itself, and returns it to the button on close. -->
    <bs-modal [(open)]="isOpen">
      <span *bsModalHeader>Edit details</span>
      <input type="text" aria-label="First field" placeholder="Focus starts in the dialog">
      <input type="text" aria-label="Second field" placeholder="Tab stays inside the dialog">
      <ng-template bsModalFooter>
        <button type="button" data-bs-dismiss="modal" [color]="colors.secondary">Close</button>
      </ng-template>
    </bs-modal>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsModalComponent, BsModalFooterDirective, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';

    @Component({
      selector: 'my-focus-trap-demo',
      templateUrl: './my-focus-trap-demo.component.html',
      imports: [BsButtonTypeDirective, BsModalComponent, BsModalHeaderDirective, BsModalFooterDirective],
    })
    export class MyFocusTrapDemoComponent {
      protected readonly colors = Color;
      protected readonly isOpen = signal(false);
    }
  `;
}
