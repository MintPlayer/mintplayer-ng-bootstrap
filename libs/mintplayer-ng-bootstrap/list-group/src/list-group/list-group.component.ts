import { Component, contentChildren, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapListGroup } from '@mintplayer/ui-core/bootstrap';
import { BsListGroupItemComponent } from '../list-group-item/list-group-item.component';

@Component({
  selector: 'bs-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsListGroupComponent {
  constructor() {
    // #452: the list-group partial ships with this component, scoped to the elements it stamps (data-mps="list-group").
    useBootstrap(bootstrapListGroup);
  }

  readonly items = contentChildren(BsListGroupItemComponent);
}
