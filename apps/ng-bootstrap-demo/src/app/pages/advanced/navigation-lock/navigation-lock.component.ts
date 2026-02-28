import { Component, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsHasNavigationLock, BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';
import { Observable } from 'rxjs';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  imports: [FormsModule, BsToggleButtonComponent, BsToggleButtonValueAccessor, BsNavigationLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationLockComponent implements BsHasNavigationLock {
  readonly navigationLock = viewChild.required<BsNavigationLockDirective>('navigationLock');
  allowExit: boolean | null = false;
  canExit = new Observable<boolean>((sub) => {
    if (this.allowExit === true) {
      sub.next(true);
    } else {
      if (confirm(this.navigationLock().exitMessage() ?? 'Are you sure you want to leave this page?')) {
        sub.next(true);
      } else {
        sub.next(false);
      }
    }
  });
  // canExit = () => {
  //   if (this.allowExit === true) {
  //     return true;
  //   } else {
  //     if (confirm(this.navigationLock.exitMessage ?? 'Are you sure you want to leave this page?')) {
  //       return true;
  //     } else {
  //       return false;
  //     }
  //   }
  // };
}
