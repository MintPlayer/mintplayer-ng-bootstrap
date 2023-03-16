import { Component, Input, TemplateRef, TrackByFunction, ViewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss']
})
export class BsMultiselectComponent<T> {

  headerTemplate!: TemplateRef<any>;
  footerTemplate!: TemplateRef<any>;
  buttonTemplate!: TemplateRef<any>;
  colors = Color;


  @Input() public items: T[] = [];
  @Input() public selectedItems: T[] = [];
  @ViewChild('defaultButtonTemplate') defaultButtonTemplate!: TemplateRef<any>;
  @Input() public itemsTrackBy?: TrackByFunction<T>;

  // itemChange(item: any, ev: Event) {
  itemChange(item: T, value: boolean | null) {
    // const value = (<any>ev.target).checked;
    if (value) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems.splice(this.selectedItems.findIndex((i) => i === item), 1);
    }
  }
  
  defaultTrackBy(index: number, item: T) {
    return item;
  }

}
