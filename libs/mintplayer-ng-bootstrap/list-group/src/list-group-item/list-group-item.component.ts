import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapListGroup } from '@mintplayer/ui-core/bootstrap/list-group';

@Component({
  selector: 'bs-list-group-item',
  templateUrl: './list-group-item.component.html',
  styleUrls: ['./list-group-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-mps]': '"list-group"',
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
  constructor() {
    // #452: the list-group partial ships with this component, scoped to the elements it stamps (data-mps="list-group").
    useBootstrap(bootstrapListGroup);
  }

  readonly active = input(false);
  readonly disabled = input(false);
}
