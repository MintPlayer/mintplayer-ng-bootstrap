import { Component, ViewChild } from '@angular/core';
import { BsHasNavigationLock, BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss']
})
export class NavigationLockComponent implements BsHasNavigationLock {
  @ViewChild('navigationLock', { read: BsNavigationLockDirective }) navigationLock!: BsNavigationLockDirective;
  @ViewChild('bsNavigationLock', { read: BsNavigationLockDirective }) bsNavigationLock!: BsNavigationLockDirective;
  allowExit: boolean | null = false;
  // canExit = new Promise<boolean>((resolve, reject) => {
  //   debugger;
  //   setTimeout(() => {
  //     console.log('this', { this: this, navigationLock: this.navigationLock, bsNavigationLock: this.bsNavigationLock });
  //     if (this.allowExit === true) {
  //       resolve(true);
  //     } else {
  //       if (confirm(this.navigationLock.exitMessage ?? 'Are you sure you want to leave this page?')) {
  //         resolve(true);
  //       } else {
  //         resolve(false);
  //       }
  //     }
  //   });
  // });
  canExit = () => {
    debugger;
    console.log('this', { this: this, navigationLock: this.navigationLock, bsNavigationLock: this.bsNavigationLock });
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
