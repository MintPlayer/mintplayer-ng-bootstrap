import { Component, input, model, TemplateRef, TrackByFunction, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss'],
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, BsHasOverlayComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsToggleButtonComponent, BsToggleButtonValueAccessor, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMultiselectComponent<T> {

  headerTemplate?: TemplateRef<any>;
  footerTemplate?: TemplateRef<any>;
  buttonTemplate?: TemplateRef<any>;
  colors = Color;


  readonly items = input<T[]>([]);
  readonly selectedItems = model<T[]>([]);
  readonly defaultButtonTemplate = viewChild.required<TemplateRef<any>>('defaultButtonTemplate');

  // itemChange(item: any, ev: Event) {
  itemChange(item: T, value: boolean | null) {
    // const value = (<any>ev.target).checked;
    if (value) {
      this.selectedItems.update(v => [...v, item]);
    } else {
      this.selectedItems.update(v => v.filter(i => i !== item));
    }
  }

}
