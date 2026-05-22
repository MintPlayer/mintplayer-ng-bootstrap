import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { dedent } from 'ts-dedent';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

interface Row {
  id: string;
  label: string;
}

@Component({
  selector: 'demo-radio',
  templateUrl: './radio.component.html',
  styleUrls: ['./radio.component.scss'],
  imports: [
    JsonPipe,
    FormsModule,
    ReactiveFormsModule,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsGridColDirective,
    BsRadioComponent,
    BsRadioGroupDirective,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioComponent {

  // 1. Group, adjacent, template-driven
  readonly selectedFruit = signal<string>('apple');

  // 2. Group, adjacent, reactive
  readonly selectedFruitReactive = new FormControl<string | null>(null);

  // 3. Group with type="toggle_button"
  readonly layout = signal<string>('grid');

  // 4. Group, non-adjacent (table row pattern)
  readonly rows = signal<Row[]>([
    { id: 'r1', label: 'Row 1' },
    { id: 'r2', label: 'Row 2' },
    { id: 'r3', label: 'Row 3' },
  ]);
  readonly selectedRow = signal<string | null>(null);

  // ---- Code snippets ---------------------------------------------------------

  readonly groupTemplateTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-group',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupDirective],
      templateUrl: './radio-group.component.html',
    })
    export class RadioGroupComponent {
      readonly selectedFruit = signal<string>('apple');
    }`;
  readonly groupTemplateHtml = dedent`
    <div bsRadioGroup name="fruit" [(ngModel)]="selectedFruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
      <bs-radio value="cherry">Cherry</bs-radio>
    </div>`;

  readonly groupReactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-group-reactive',
      imports: [ReactiveFormsModule, BsRadioComponent, BsRadioGroupDirective],
      templateUrl: './radio-group-reactive.component.html',
    })
    export class RadioGroupReactiveComponent {
      readonly selectedFruit = new FormControl<string | null>(null);
    }`;
  readonly groupReactiveHtml = dedent`
    <div bsRadioGroup name="fruit" [formControl]="selectedFruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
      <bs-radio value="cherry">Cherry</bs-radio>
    </div>`;

  readonly toggleButtonTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-toggle-button',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupDirective],
      templateUrl: './radio-toggle-button.component.html',
    })
    export class RadioToggleButtonComponent {
      readonly layout = signal<string>('grid');
    }`;
  readonly toggleButtonHtml = dedent`
    <div bsRadioGroup name="layout" [(ngModel)]="layout">
      <bs-radio type="toggle_button" value="grid">Grid</bs-radio>
      <bs-radio type="toggle_button" value="list">List</bs-radio>
      <bs-radio type="toggle_button" value="cards">Cards</bs-radio>
    </div>`;

  readonly groupTableTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-table',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupDirective],
      templateUrl: './radio-table.component.html',
    })
    export class RadioTableComponent {
      readonly rows = signal([
        { id: 'r1', label: 'Row 1' },
        { id: 'r2', label: 'Row 2' },
        { id: 'r3', label: 'Row 3' },
      ]);
      readonly selectedRow = signal<string | null>(null);
    }`;
  readonly groupTableHtml = dedent`
    <table>
      <tbody bsRadioGroup name="selectedRow"
             #g="bsRadioGroup"
             [(ngModel)]="selectedRow">
        @for (row of rows(); track row.id) {
          <tr>
            <td><bs-radio [group]="g" [value]="row.id" /></td>
            <td>{{ row.label }}</td>
          </tr>
        }
      </tbody>
    </table>`;
}
