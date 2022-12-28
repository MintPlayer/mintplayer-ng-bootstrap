import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss']
})
export class BsMultiselectComponent {

  headerTemplate!: TemplateRef<any>;
  footerTemplate!: TemplateRef<any>;
  buttonTemplate!: TemplateRef<any>;
  colors = Color;


  @Input() public items: any[] = [];
  @Input() public selectedItems: any[] = [];
  @ViewChild('defaultButtonTemplate') defaultButtonTemplate!: TemplateRef<any>;

  // itemChange(item: any, ev: Event) {
  itemChange(item: any, value: boolean | null) {
    // const value = (<any>ev.target).checked;
    if (value) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems.splice(this.selectedItems.findIndex((i) => i === item), 1);
    }
  }
  
}
