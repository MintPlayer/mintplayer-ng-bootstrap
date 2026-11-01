import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapModalPage } from '@mintplayer/ui-core/bootstrap';
import {
  BsModalHostComponent, BsModalDirective, BsModalHeaderDirective,
  BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective,
} from '@mintplayer/ng-bootstrap/modal';

@Component({
  selector: 'demo-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  imports: [BsModalHostComponent, BsModalDirective, BsModalHeaderDirective,
    BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  constructor() {
    // Raw Bootstrap markup on this page: it installs the verbatim parts itself, never globally (#452).
    useBootstrap(bootstrapModalPage);
  }

  readonly title = input('Confirm');
  isOpen = signal(false);
  message = signal('Are you sure?');
  private resolver: ((v: boolean) => void) | null = null;

  /** Programmatic API used from `canExit`. Resolves with the user's choice. */
  confirm(message?: string): Promise<boolean> {
    if (message) this.message.set(message);
    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
      this.isOpen.set(true);
    });
  }

  onChoice(value: boolean) {
    this.isOpen.set(false);
    const r = this.resolver;
    this.resolver = null;
    r?.(value);
  }
}
