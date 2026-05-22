import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import { ConfirmDialogComponent } from '../../../../components/confirm-dialog/confirm-dialog.component';
@Component({
  selector: 'demo-nav-lock-child-a',
  templateUrl: './child-a.component.html',
  imports: [FormsModule, BsNavigationLockDirective, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildAComponent {
  private readonly dialog = viewChild.required(ConfirmDialogComponent);
  readonly dirty = signal(true);

  canExit = (): boolean | Promise<boolean> => {
    if (!this.dirty()) return true;
    return this.dialog().confirm('Leave dirty form?');
  };
}
