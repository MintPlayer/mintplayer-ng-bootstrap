import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  imports: [FormsModule, BsToggleButtonComponent, BsNavigationLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationLockComponent {
  allowExit: boolean | null = false;
  exitMessage = 'Are you sure you want to leave this page?';

  canExit = (): boolean => {
    if (this.allowExit === true) {
      return true;
    }
    return confirm(this.exitMessage);
  };
}
