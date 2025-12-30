import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'bs-dropdown-item',
  templateUrl: './dropdown-item.component.html',
  styleUrls: ['./dropdown-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDropdownItemComponent {
  @Input() public isSelected = false;
  @Input() public disabled = false;
}
