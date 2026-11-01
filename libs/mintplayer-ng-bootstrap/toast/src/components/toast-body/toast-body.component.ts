import { Component, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapToasts } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-toast-body',
  templateUrl: './toast-body.component.html',
  styleUrls: ['./toast-body.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-mps]': '"toast"',
    '[class.d-flex]': 'true',
    '[class.toast-body]': 'true',
  },
})
export class BsToastBodyComponent {
  constructor() {
    // #452: the toasts partial ships with this component, scoped to the elements it stamps (data-mps="toast").
    useBootstrap(bootstrapToasts);
  }

}
