import { booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapListGroup } from '@mintplayer/ui-core/bootstrap';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host IS the .list-group (as bs-list-group-item's host is the
  // .list-group-item and bs-card's the .card), so the DOM nests the way stock
  // Bootstrap expects: `.card > .list-group` and a consumer's
  // `[flush]` (Bootstrap's .list-group-flush) apply with no extra rule (#452).
  // role=list because the items are not <li> (they were never valid <ul> children).
  host: {
    '[attr.data-mps]': '"list-group"',
    '[class.list-group]': 'true',
    '[class.list-group-flush]': 'flush()',
    'role': 'list',
  },
})
export class BsListGroupComponent {
  constructor() {
    // #452: the list-group partial ships with this component, scoped to the elements it stamps (data-mps="list-group").
    useBootstrap(bootstrapListGroup);
  }

  /**
   * Bootstrap's `.list-group-flush`: no outer borders and no rounded corners, so
   * the list sits edge to edge in its container (a card's border frames it).
   */
  readonly flush = input(false, { transform: booleanAttribute });

  readonly items = contentChildren(BsListGroupItemComponent);
}
