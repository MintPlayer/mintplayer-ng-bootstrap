import { Component, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-dropdown-item',
  templateUrl: './dropdown-item.component.html',
  styleUrls: ['./dropdown-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDropdownItemComponent {
  readonly isSelected = input(false);
  readonly disabled = input(false);
}
