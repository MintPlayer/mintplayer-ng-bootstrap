import { Component, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapToasts } from '@mintplayer/ui-core/bootstrap/toasts';

@Component({
  selector: 'bs-toast-header',
  templateUrl: './toast-header.component.html',
  styleUrls: ['./toast-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-mps]': '"toast"',
    '[class.toast-header]': 'true',
  },
})
export class BsToastHeaderComponent {
  constructor() {
    // #452: the toasts partial ships with this component, scoped to the elements it stamps (data-mps="toast").
    useBootstrap(bootstrapToasts);
  }

}
