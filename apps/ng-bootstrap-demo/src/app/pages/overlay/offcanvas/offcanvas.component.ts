import { Component, inject, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, Position } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasHostComponent, BsOffcanvasContentDirective, BsOffcanvasCloseDirective, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasPushDirective } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  imports: [BsCodeSnippetComponent, RouterLink, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCloseComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuComponent, BsDropdownItemComponent, BsOffcanvasHostComponent, BsOffcanvasContentDirective, BsOffcanvasCloseDirective, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasPushDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasComponent {
  gitRepo = inject(GIT_REPO);

  colors = Color;
  position = signal<Position>('start');
  offcanvasVisible = model(false);
  sidebarVisible = model(false);
  showOffcanvas(position: Position) {
    this.position.set(position);
    this.offcanvasVisible.set(true);
  }

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="visible.set(true)">Open offcanvas</button>

    <bs-offcanvas [(isVisible)]="visible" [position]="'end'" [hasBackdrop]="true" (backdropClick)="visible.set(false)">
      <div *bsOffcanvasContent>
        <bs-offcanvas-header>
          <h5 class="offcanvas-title flex-grow-1">Offcanvas title</h5>
          <bs-close bsOffcanvasClose></bs-close>
        </bs-offcanvas-header>
        <bs-offcanvas-body>
          Place any content here — forms, lists, navigation.
        </bs-offcanvas-body>
      </div>
    </bs-offcanvas>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
    import {
      BsOffcanvasHostComponent,
      BsOffcanvasContentDirective,
      BsOffcanvasCloseDirective,
      OffcanvasHeaderComponent,
      OffcanvasBodyComponent,
    } from '@mintplayer/ng-bootstrap/offcanvas';

    @Component({
      selector: 'my-offcanvas-demo',
      templateUrl: './my-offcanvas-demo.component.html',
      imports: [
        BsOffcanvasHostComponent,
        BsOffcanvasContentDirective,
        BsOffcanvasCloseDirective,
        OffcanvasHeaderComponent,
        OffcanvasBodyComponent,
        BsCloseComponent,
        BsButtonTypeDirective,
      ],
    })
    export class MyOffcanvasDemoComponent {
      protected readonly colors = Color;
      protected readonly visible = model(false);
    }
  `;
}
