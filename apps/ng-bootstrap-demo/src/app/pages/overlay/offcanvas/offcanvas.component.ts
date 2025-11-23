import { Component, inject, Inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, Position } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  standalone: true,
  imports: [RouterLink, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCloseComponent, BsDropdownModule, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuModule, BsOffcanvasModule, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsToggleButtonComponent]
})
export class OffcanvasComponent {

  colors = Color;
  position = signal<Position>('start');
  offcanvasVisible = false;
  sidebarVisible = false;
  gitRepo = inject(GIT_REPO);
  
  showOffcanvas(position: Position) {
    this.position.set(position);
    setTimeout(() => this.offcanvasVisible = true, 50);
  }
}
