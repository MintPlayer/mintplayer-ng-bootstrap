import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective, BsItemTemplateDirective } from '@mintplayer/ng-bootstrap/multiselect';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-multiselect-dropdown',
  templateUrl: './multiselect-dropdown.component.html',
  styleUrls: ['./multiselect-dropdown.component.scss'],
  imports: [BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective, BsItemTemplateDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiselectDropdownComponent {

  readonly availableItems = signal(['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink']);
  readonly selectedItems = signal<string[]>([]);

  protected readonly snippetBasicHtml = dedent`
    <bs-multiselect [(selectedItems)]="selectedItems">
      <ng-container *bsButtonTemplate="let count">
        {{ count }} selected
      </ng-container>
      <ng-container *bsItemTemplate="let item of availableItems()">
        {{ item }}
      </ng-container>
    </bs-multiselect>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsMultiselectComponent,
      BsButtonTemplateDirective,
      BsItemTemplateDirective,
    } from '@mintplayer/ng-bootstrap/multiselect';

    @Component({
      selector: 'my-multiselect-demo',
      templateUrl: './my-multiselect-demo.component.html',
      imports: [
        BsMultiselectComponent,
        BsButtonTemplateDirective,
        BsItemTemplateDirective,
      ],
    })
    export class MyMultiselectDemoComponent {
      readonly availableItems = signal(['Blue', 'Red', 'Green', 'Yellow']);
      readonly selectedItems = signal<string[]>([]);
    }
  `;

}
