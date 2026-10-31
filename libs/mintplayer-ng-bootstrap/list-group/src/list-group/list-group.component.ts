import { Component, contentChildren, ChangeDetectionStrategy} from '@angular/core';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  // The page baseline styles .list-group (C1). The former component sheet
  // re-imported Bootstrap's list-group partial UNLAYERED, which out-ranked
  // every layered component rule (the card's, #452). The host is a custom
  // element: a block of its own, not only inside a flex parent.
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsListGroupComponent {
  readonly items = contentChildren(BsListGroupItemComponent);
}
