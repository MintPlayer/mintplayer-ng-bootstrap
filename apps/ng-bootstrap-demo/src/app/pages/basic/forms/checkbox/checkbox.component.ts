import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { dedent } from 'ts-dedent';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsCheckboxComponent, BsCheckboxGroupDirective } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

interface Row {
  id: string;
  label: string;
}

@Component({
  selector: 'demo-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  imports: [
    JsonPipe,
    FormsModule,
    ReactiveFormsModule,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsGridColDirective,
    BsCheckboxComponent,
    BsCheckboxGroupDirective,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent {

  // 1. Single, template-driven
  readonly agreed = signal(false);

  // 2. Single, reactive
  readonly agreedReactive = new FormControl(false, { nonNullable: true });

  // 3. Switch
  readonly darkMode = signal(false);

  // 4. Toggle-button (standalone)
  readonly bold = signal(false);

  // 5. Group, adjacent, template-driven
  readonly toppings = signal<string[]>([]);

  // 6. Group, adjacent, reactive
  readonly toppingsReactive = new FormControl<string[]>([], { nonNullable: true });

  // 7. Group, non-adjacent (table)
  readonly rows = signal<Row[]>([
    { id: 'r1', label: 'Row 1' },
    { id: 'r2', label: 'Row 2' },
    { id: 'r3', label: 'Row 3' },
  ]);
  readonly selectedRows = signal<string[]>([]);

  // ---- Code snippets ---------------------------------------------------------

  readonly singleTemplateTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-single-checkbox',
      imports: [FormsModule, BsCheckboxComponent],
      templateUrl: './single-checkbox.component.html',
    })
    export class SingleCheckboxComponent {
      readonly agreed = signal(false);
    }`;
  readonly singleTemplateHtml = dedent`
    <bs-checkbox name="agree" [(ngModel)]="agreed">
      I agree to the terms
    </bs-checkbox>`;

  readonly singleReactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-single-checkbox-reactive',
      imports: [ReactiveFormsModule, BsCheckboxComponent],
      templateUrl: './single-checkbox-reactive.component.html',
    })
    export class SingleCheckboxReactiveComponent {
      readonly agreed = new FormControl(false, { nonNullable: true });
    }`;
  readonly singleReactiveHtml = dedent`
    <bs-checkbox name="agree" [formControl]="agreed">
      I agree to the terms
    </bs-checkbox>`;

  readonly switchTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-switch',
      imports: [FormsModule, BsCheckboxComponent],
      templateUrl: './switch.component.html',
    })
    export class SwitchComponent {
      readonly darkMode = signal(false);
    }`;
  readonly switchHtml = dedent`
    <bs-checkbox type="switch" [(ngModel)]="darkMode">
      Dark mode
    </bs-checkbox>`;

  readonly toggleButtonTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-toggle-button',
      imports: [FormsModule, BsCheckboxComponent],
      templateUrl: './toggle-button.component.html',
    })
    export class ToggleButtonComponent {
      readonly bold = signal(false);
    }`;
  readonly toggleButtonHtml = dedent`
    <bs-checkbox type="toggle_button" [(ngModel)]="bold">
      Bold
    </bs-checkbox>`;

  readonly groupTemplateTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent, BsCheckboxGroupDirective } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-checkbox-group',
      imports: [FormsModule, BsCheckboxComponent, BsCheckboxGroupDirective],
      templateUrl: './checkbox-group.component.html',
    })
    export class CheckboxGroupComponent {
      readonly toppings = signal<string[]>([]);
    }`;
  readonly groupTemplateHtml = dedent`
    <div bsCheckboxGroup name="toppings" [(ngModel)]="toppings">
      <bs-checkbox value="cheese">Cheese</bs-checkbox>
      <bs-checkbox value="mushroom">Mushroom</bs-checkbox>
      <bs-checkbox value="olive">Olive</bs-checkbox>
    </div>`;

  readonly groupReactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsCheckboxComponent, BsCheckboxGroupDirective } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-checkbox-group-reactive',
      imports: [ReactiveFormsModule, BsCheckboxComponent, BsCheckboxGroupDirective],
      templateUrl: './checkbox-group-reactive.component.html',
    })
    export class CheckboxGroupReactiveComponent {
      readonly toppings = new FormControl<string[]>([], { nonNullable: true });
    }`;
  readonly groupReactiveHtml = dedent`
    <div bsCheckboxGroup name="toppings" [formControl]="toppings">
      <bs-checkbox value="cheese">Cheese</bs-checkbox>
      <bs-checkbox value="mushroom">Mushroom</bs-checkbox>
      <bs-checkbox value="olive">Olive</bs-checkbox>
    </div>`;

  readonly groupTableTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsCheckboxComponent, BsCheckboxGroupDirective } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'app-checkbox-table',
      imports: [FormsModule, BsCheckboxComponent, BsCheckboxGroupDirective],
      templateUrl: './checkbox-table.component.html',
    })
    export class CheckboxTableComponent {
      readonly rows = signal([
        { id: 'r1', label: 'Row 1' },
        { id: 'r2', label: 'Row 2' },
        { id: 'r3', label: 'Row 3' },
      ]);
      readonly selectedRows = signal<string[]>([]);
    }`;
  readonly groupTableHtml = dedent`
    <table>
      <tbody bsCheckboxGroup name="rows"
             #g="bsCheckboxGroup"
             [(ngModel)]="selectedRows">
        @for (row of rows(); track row.id) {
          <tr>
            <td><bs-checkbox [group]="g" [value]="row.id" /></td>
            <td>{{ row.label }}</td>
          </tr>
        }
      </tbody>
    </table>`;
}
