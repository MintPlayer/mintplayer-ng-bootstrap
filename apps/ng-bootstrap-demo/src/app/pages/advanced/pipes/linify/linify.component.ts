import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-linify',
  templateUrl: './linify.component.html',
  styleUrls: ['./linify.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsLinifyPipe, BsListGroupComponent, BsListGroupItemComponent, BsCheckboxComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinifyComponent {
  text = dedent`
    See the stone set in your eyes
    See the thorn twist in your side
    I'll wait for you

    Sleight of hand and twist of fate
    On a bed of nails, she makes me wait
    And I wait without you`;
  removeEmptyEntries = true;

  protected readonly snippetBasicHtml = dedent`
    <bs-list-group>
      @for (line of (text | bsLinify: removeEmptyEntries); track $index) {
        <bs-list-group-item>{{ line }}</bs-list-group-item>
      }
    </bs-list-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
    import {
      BsListGroupComponent,
      BsListGroupItemComponent,
    } from '@mintplayer/ng-bootstrap/list-group';

    @Component({
      selector: 'my-linify-demo',
      templateUrl: './my-linify-demo.component.html',
      imports: [BsLinifyPipe, BsListGroupComponent, BsListGroupItemComponent],
    })
    export class MyLinifyDemoComponent {
      protected text = 'first line\\nsecond line\\n\\nfourth line';
      protected removeEmptyEntries = true;
    }
  `;
}
