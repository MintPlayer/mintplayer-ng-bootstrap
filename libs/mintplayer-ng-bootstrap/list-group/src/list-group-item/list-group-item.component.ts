import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'bs-list-group-item',
  templateUrl: './list-group-item.component.html',
  styleUrls: ['./list-group-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.list-group-item]': 'true',
    'role': 'listitem',
    '[class.active]': 'active()',
    '[class.disabled]': 'disabled()',
    // aria-current says WHICH item is current; the .active class alone was
    // visual-only. Disabled items are perceivable but marked.
    '[attr.aria-current]': 'active() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
})
export class BsListGroupItemComponent {
  readonly active = input(false);
  readonly disabled = input(false);
}
