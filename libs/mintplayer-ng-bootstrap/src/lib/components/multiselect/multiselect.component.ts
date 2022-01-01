import { Component, ContentChild, Input, OnInit, TemplateRef } from '@angular/core';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss']
})
export class BsMultiselectComponent implements OnInit {

  constructor() {
  }

  @ContentChild(TemplateRef) template!: TemplateRef<any>;
  @Input() public items: any[] = [];
  @Input() public selectedItems: any[] = [];

  itemChange(item: any, event: Event) {
    if (!!(<any>event.target).checked) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems.splice(this.selectedItems.findIndex((i) => i === item), 1);
    }
  }
  
  ngOnInit(): void {
  }


}
