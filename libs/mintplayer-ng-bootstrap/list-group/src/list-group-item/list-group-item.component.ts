import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-list-group-item',
  templateUrl: './list-group-item.component.html',
  styleUrls: ['./list-group-item.component.scss'],
})
export class BsListGroupItemComponent {
  @HostBinding('class.list-group-item') classes = true;
}
