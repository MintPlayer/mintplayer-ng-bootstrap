import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsColFormLabelDirective, BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-navigation-lock',
  templateUrl: './navigation-lock.component.html',
  styleUrls: ['./navigation-lock.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsForDirective, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective, BsCheckboxComponent, BsNavigationLockDirective],
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

  protected readonly snippetBasicHtml = dedent`
    <section bsNavigationLock [canExit]="canExit">
      <input type="text" name="firstName" [(ngModel)]="firstName">
    </section>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';

    @Component({
      selector: 'my-navigation-lock-demo',
      templateUrl: './my-navigation-lock-demo.component.html',
      imports: [FormsModule, BsNavigationLockDirective],
    })
    export class MyNavigationLockDemoComponent {
      protected firstName = '';

      protected canExit = (): boolean => {
        return confirm('Are you sure you want to leave?');
      };
    }
  `;
}
