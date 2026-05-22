import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-split-string',
  templateUrl: './split-string.component.html',
  styleUrls: ['./split-string.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsListGroupComponent, BsListGroupItemComponent, BsSplitStringPipe, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitStringComponent {
  text = '';

  protected readonly snippetBasicHtml = dedent`
    <!-- Removes empty entries (default) -->
    <bs-list-group>
      @for (line of text | bsSplitString; track $index) {
        <bs-list-group-item>{{ line }}</bs-list-group-item>
      }
    </bs-list-group>

    <!-- Keeps empty entries -->
    <bs-list-group>
      @for (line of text | bsSplitString: undefined:false; track $index) {
        <bs-list-group-item>{{ line }}</bs-list-group-item>
      }
    </bs-list-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';
    import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
    @Component({
      selector: 'my-split-string-demo',
      templateUrl: './my-split-string-demo.component.html',
      imports: [
        BsSplitStringPipe,
        BsListGroupComponent,
        BsListGroupItemComponent,
      ],
    })
    export class MySplitStringDemoComponent {
      protected text = 'one\\ntwo\\n\\nfour';
    }
  `;
}
