import { Component, input, TemplateRef, TrackByFunction, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMultiselectComponent<T> {

  headerTemplate?: TemplateRef<any>;
  footerTemplate?: TemplateRef<any>;
  buttonTemplate?: TemplateRef<any>;
  colors = Color;


  readonly items = input<T[]>([]);
  readonly selectedItems = input<T[]>([]);
  readonly defaultButtonTemplate = viewChild.required<TemplateRef<any>>('defaultButtonTemplate');

  // itemChange(item: any, ev: Event) {
  itemChange(item: T, value: boolean | null) {
    // const value = (<any>ev.target).checked;
    if (value) {
      this.selectedItems().push(item);
    } else {
      this.selectedItems().splice(this.selectedItems().findIndex((i) => i === item), 1);
    }
  }

}
