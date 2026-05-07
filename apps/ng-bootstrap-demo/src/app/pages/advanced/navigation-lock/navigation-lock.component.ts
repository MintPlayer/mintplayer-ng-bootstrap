import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsColFormLabelDirective, BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  imports: [FormsModule, BsForDirective, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective, BsToggleButtonComponent, BsNavigationLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationLockComponent {
  allowExit: boolean | null = false;
  exitMessage = 'Are you sure you want to leave this page?';

  firstName = '';
  lastName = '';
  notes = '';

  canExit = (): boolean => {
    if (this.allowExit === true) {
      return true;
    }
    return confirm(this.exitMessage);
  };
}
