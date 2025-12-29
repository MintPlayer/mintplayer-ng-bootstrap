import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { Observable } from 'rxjs';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsToggleButtonModule, BsNavigationLockModule]
})
export class NavigationLockComponent {
  allowExit: boolean | null = false;

  canExit = new Observable<boolean>((sub) => {
    if (this.allowExit === true) {
      sub.next(true);
    } else {
      if (confirm('Are you sure you want to leave this page?')) {
        sub.next(true);
      } else {
        sub.next(false);
      }
    }
  });

  message = '';
}
