import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective } from '@mintplayer/ng-bootstrap/multiselect';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-multiselect-dropdown',
  templateUrl: './multiselect-dropdown.component.html',
  styleUrls: ['./multiselect-dropdown.component.scss'],
  standalone: true,
  imports: [BsFormComponent, BsFormControlDirective, BsMultiselectComponent, BsHeaderTemplateDirective, BsFooterTemplateDirective, BsButtonTemplateDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiselectDropdownComponent {

  availableItems = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink'];
  selectedItems: string[] = [];

}
