import { Component, inject, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, Position } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasHostComponent, BsOffcanvasContentDirective, BsOffcanvasCloseDirective, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasPushDirective } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  imports: [RouterLink, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCloseComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuComponent, BsDropdownItemComponent, BsOffcanvasHostComponent, BsOffcanvasContentDirective, BsOffcanvasCloseDirective, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasPushDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsToggleButtonComponent],
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
}
