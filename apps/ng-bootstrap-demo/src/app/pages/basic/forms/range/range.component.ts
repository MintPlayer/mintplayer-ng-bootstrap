import { DemoFormStateComponent } from '../../../../components/form-state/form-state.component';
import { Component, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  imports: [ReactiveFormsModule, DemoFormStateComponent, FormsModule, BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsRangeComponent, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<number>(4);
  protected readonly formsControl = new FormControl<number>(4, { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-range [min]="0" [max]="10" [(ngModel)]="value"></bs-range>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-range [min]="0" [max]="10" [formControl]="control"></bs-range>
  `;


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
