import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective, BsItemTemplateDirective } from '@mintplayer/ng-bootstrap/multiselect';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-multiselect-dropdown',
  templateUrl: './multiselect-dropdown.component.html',
  styleUrls: ['./multiselect-dropdown.component.scss'],
  imports: [BsFormComponent, BsFormControlDirective, BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective, BsItemTemplateDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiselectDropdownComponent {

  readonly availableItems = signal(['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink']);
  readonly selectedItems = signal<string[]>([]);

}
