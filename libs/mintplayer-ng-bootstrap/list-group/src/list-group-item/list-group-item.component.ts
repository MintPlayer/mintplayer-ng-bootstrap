import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-list-group-item',
  templateUrl: './list-group-item.component.html',
  styleUrls: ['./list-group-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.list-group-item]': 'true',
  },
})
export class BsListGroupItemComponent {
}
