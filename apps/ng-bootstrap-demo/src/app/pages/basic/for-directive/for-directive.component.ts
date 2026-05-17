import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-for-directive',
  templateUrl: './for-directive.component.html',
  styleUrls: ['./for-directive.component.scss'],
  imports: [BsCodeSnippetComponent, BsForDirective, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForDirectiveComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-grid>
        <div bsRow class="mb-3">
          <label [md]="4" bsColFormLabel [bsFor]="firstName">First name</label>
          <div [md]="8">
            <input type="text" #firstName>
          </div>
        </div>
      </bs-grid>
    </bs-form>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
    import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
    import {
      BsGridComponent,
      BsGridRowDirective,
      BsColFormLabelDirective,
    } from '@mintplayer/ng-bootstrap/grid';

    @Component({
      selector: 'my-for-demo',
      templateUrl: './my-for-demo.component.html',
      imports: [
        BsForDirective,
        BsFormComponent,
        BsGridComponent,
        BsGridRowDirective,
        BsColFormLabelDirective,
      ],
    })
    export class MyForDemoComponent {}
  `;
}
