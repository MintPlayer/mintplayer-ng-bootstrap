import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsRangeComponent, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeComponent {

  rangeValue = model(2);
  isDisabled = model(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-range [min]="0" [max]="100" [(ngModel)]="value"></bs-range>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';

    @Component({
      selector: 'my-range-demo',
      templateUrl: './my-range-demo.component.html',
      imports: [FormsModule, BsRangeComponent],
    })
    export class MyRangeDemoComponent {
      readonly value = model(50);
    }
  `;
}
