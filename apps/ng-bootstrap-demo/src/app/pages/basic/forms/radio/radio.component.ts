import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapTablesPage } from '@mintplayer/ui-core/bootstrap/tables';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { dedent } from 'ts-dedent';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRadioComponent, BsRadioGroupComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

interface Row {
  id: string;
  label: string;
  size: WritableSignal<string | null>;
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
    BsRadioGroupComponent,
    BsRadioGroupDirective,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioComponent {
  constructor() {
    // Raw Bootstrap markup on this page: it installs the verbatim parts itself, never globally (#452).
    useBootstrap(bootstrapTablesPage);
  }


  // 1. Group, adjacent, template-driven
  readonly selectedFruit = signal<string>('apple');

  // 2. Group, adjacent, reactive
  readonly selectedFruitReactive = new FormControl<string | null>(null);

  // 3. Group with type="toggle_button"
  readonly layout = signal<string>('grid');

  // 4. Group, non-adjacent (table row pattern)
  readonly sizes = ['S', 'M', 'L'];
  readonly rows = signal<Row[]>([
    { id: 'r1', label: 'Row 1', size: signal<string | null>('M') },
    { id: 'r2', label: 'Row 2', size: signal<string | null>(null) },
    { id: 'r3', label: 'Row 3', size: signal<string | null>('L') },
  ]);
  readonly selectedRow = signal<string | null>(null);

  // ---- Code snippets ---------------------------------------------------------

  readonly groupTemplateTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupComponent } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-group',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupComponent],
      templateUrl: './radio-group.component.html',
    })
    export class RadioGroupComponent {
      readonly selectedFruit = signal<string>('apple');
    }`;
  readonly groupTemplateHtml = dedent`
    <bs-radio-group name="fruit" aria-label="Fruit" [(ngModel)]="selectedFruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
      <bs-radio value="cherry">Cherry</bs-radio>
    </bs-radio-group>`;

  readonly groupReactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupComponent } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-group-reactive',
      imports: [ReactiveFormsModule, BsRadioComponent, BsRadioGroupComponent],
      templateUrl: './radio-group-reactive.component.html',
    })
    export class RadioGroupReactiveComponent {
      readonly selectedFruit = new FormControl<string | null>(null);
    }`;
  readonly groupReactiveHtml = dedent`
    <bs-radio-group name="fruit" aria-label="Fruit" [formControl]="selectedFruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
      <bs-radio value="cherry">Cherry</bs-radio>
    </bs-radio-group>`;

  readonly toggleButtonTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupComponent } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-toggle-button',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupComponent],
      templateUrl: './radio-toggle-button.component.html',
    })
    export class RadioToggleButtonComponent {
      readonly layout = signal<string>('grid');
    }`;
  readonly toggleButtonHtml = dedent`
    <bs-radio-group name="layout" aria-label="Layout" [(ngModel)]="layout">
      <bs-radio type="toggle_button" value="grid">Grid</bs-radio>
      <bs-radio type="toggle_button" value="list">List</bs-radio>
      <bs-radio type="toggle_button" value="cards">Cards</bs-radio>
    </bs-radio-group>`;

  readonly groupTableTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsRadioComponent, BsRadioGroupComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';

    @Component({
      selector: 'app-radio-table',
      imports: [FormsModule, BsRadioComponent, BsRadioGroupComponent, BsRadioGroupDirective],
      templateUrl: './radio-table.component.html',
    })
    export class RadioTableComponent {
      readonly sizes = ['S', 'M', 'L'];
      readonly rows = signal([
        { id: 'r1', label: 'Row 1', size: signal<string | null>('M') },
        { id: 'r2', label: 'Row 2', size: signal<string | null>(null) },
        { id: 'r3', label: 'Row 3', size: signal<string | null>('L') },
      ]);
      readonly selectedRow = signal<string | null>(null);
    }`;
  readonly groupTableHtml = dedent`
    <table>
      <!-- The attribute form: a group on a host the page already has. -->
      <tbody bsRadioGroup name="selectedRow" [(ngModel)]="selectedRow">
        @for (row of rows(); track row.id) {
          <tr>
            <td><bs-radio [value]="row.id"
                          [inputLabel]="'Select ' + row.label" /></td>
            <td>{{ row.label }}</td>
            <td>
              <!-- A group of its own: the nearest group wins. -->
              <bs-radio-group [attr.aria-label]="'Size of ' + row.label"
                              [(value)]="row.size">
                @for (size of sizes; track size) {
                  <bs-radio [value]="size" [inline]="true">{{ size }}</bs-radio>
                }
              </bs-radio-group>
            </td>
          </tr>
        }
      </tbody>
    </table>`;
}
