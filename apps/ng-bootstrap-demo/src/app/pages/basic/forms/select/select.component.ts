import { DemoFormStateComponent } from '../../../../components/form-state/form-state.component';
import { JsonPipe } from '@angular/common';
import { Component, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  imports: [ReactiveFormsModule, DemoFormStateComponent, JsonPipe, FormsModule, BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<string | null>('m');
  protected readonly formsControl = new FormControl<string | null>('m', { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-select [(ngModel)]="value" aria-label="Size">
      <option value="">Pick a size</option>
      <option value="s">Small</option>
      <option value="m">Medium</option>
      <option value="l">Large</option>
    </bs-select>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-select [formControl]="control" aria-label="Size">
      <option value="">Pick a size</option>
      <option value="s">Small</option>
      <option value="m">Medium</option>
      <option value="l">Large</option>
    </bs-select>
  `;


  disableSelectBox = model(false);
  selectedDishBootstrapSelect = model<Dish | null>(null);
  dishes: Dish[] = [
    { id: 1, name: 'Salmon', description: 'Salmon with mini-tomatoes', ingredients: ['Salmon', 'tomatoes', 'Pepper sauce'] },
    { id: 2, name: 'Spaghetti', description: 'Spaghetti Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Mushrooms'] },
    { id: 3, name: 'Lasagna', description: 'Lasagna Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Cheese'] },
  ];

  protected readonly snippetBasicHtml = dedent`
    <bs-select [(ngModel)]="selected">
      <option [ngValue]="null" selected>Choose a dish</option>
      @for (dish of dishes; track dish.id) {
        <option [ngValue]="dish">{{ dish.name }}</option>
      }
    </bs-select>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';

    interface Dish { id: number; name: string; }

    @Component({
      selector: 'my-select-demo',
      templateUrl: './my-select-demo.component.html',
      imports: [FormsModule, BsSelectComponent, BsSelectOption],
    })
    export class MySelectDemoComponent {
      readonly selected = model<Dish | null>(null);
      readonly dishes: Dish[] = [
        { id: 1, name: 'Salmon' },
        { id: 2, name: 'Spaghetti' },
        { id: 3, name: 'Lasagna' },
      ];
    }
  `;
}

interface Dish {
  id: number;
  name: string;
  description: string;
  ingredients: string[];
}