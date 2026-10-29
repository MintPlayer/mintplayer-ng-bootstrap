import { DemoFormStateComponent } from '../../../components/form-state/form-state.component';
import { Component, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { DecimalPipe } from '@angular/common';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [ReactiveFormsModule, DemoFormStateComponent, DecimalPipe, FormsModule, BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsButtonTypeDirective, BsButtonGroupComponent, BsColorPickerComponent, BsCheckboxComponent, BsRangeComponent, BsListGroupComponent, BsListGroupItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<string>('#0d6efd');
  protected readonly formsControl = new FormControl<string>('#0d6efd', { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-color-picker [(ngModel)]="value"></bs-color-picker>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-color-picker [formControl]="control"></bs-color-picker>
  `;


  colors = Color;
  allowAlpha = model(false);
  screenreaderFriendly = model(false);
  selectedColor = model('#0000FF');
  selectedAlpha = model(1);

  setColor(color: string) {
    this.selectedColor.set(color);
    this.selectedAlpha.set(1);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-color-picker [(ngModel)]="color"></bs-color-picker>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';

    @Component({
      selector: 'my-color-picker-demo',
      templateUrl: './my-color-picker-demo.component.html',
      imports: [FormsModule, BsColorPickerComponent],
    })
    export class MyColorPickerDemoComponent {
      protected color = '#0000FF';
    }
  `;
}
