import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsHasNavigationLock, BsNavigationLockDirective, BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  standalone: true,
  imports: [FormsModule, BsToggleButtonModule, BsNavigationLockModule]
})
export class NavigationLockComponent implements BsHasNavigationLock {
  @ViewChild('navigationLock') navigationLock!: BsNavigationLockDirective;
  allowExit: boolean | null = false;
  canExit = () => {
    if (this.allowExit === true) {
      return true;
    } else {
      if (confirm(this.navigationLock.exitMessage ?? 'Are you sure you want to leave this page?')) {
        return true;
      } else {
        return false;
      }
    }
  };
}
