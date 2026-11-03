import { Component, inject, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemDirective } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasComponent, BsOffcanvasHeaderDirective, OffcanvasPosition } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  imports: [BsCodeSnippetComponent, RouterLink, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCloseComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuComponent, BsDropdownItemDirective, BsOffcanvasComponent, BsOffcanvasHeaderDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasComponent {
  gitRepo = inject(GIT_REPO);

  colors = Color;
  position = signal<OffcanvasPosition>('start');
  offcanvasVisible = model(false);
  sidebarVisible = model(false);
  showOffcanvas(position: OffcanvasPosition) {
    this.position.set(position);
    this.offcanvasVisible.set(true);
  }

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="visible.set(true)">Open offcanvas</button>

    <bs-offcanvas [(open)]="visible" position="end">
      <span *bsOffcanvasHeader>Offcanvas title</span>
      Place any content here — forms, lists, navigation.
    </bs-offcanvas>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsOffcanvasComponent, BsOffcanvasHeaderDirective } from '@mintplayer/ng-bootstrap/offcanvas';

    @Component({
      selector: 'my-offcanvas-demo',
      templateUrl: './my-offcanvas-demo.component.html',
      imports: [BsOffcanvasComponent, BsOffcanvasHeaderDirective, BsButtonTypeDirective],
    })
    export class MyOffcanvasDemoComponent {
      protected readonly colors = Color;
      protected readonly visible = model(false);
    }
  `;
}
