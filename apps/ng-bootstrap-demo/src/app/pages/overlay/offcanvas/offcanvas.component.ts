import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, Position } from '@mintplayer/ng-bootstrap';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  standalone: true,
  imports: [RouterLink, BsGridModule, BsCloseComponent, BsDropdownModule, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuModule, BsOffcanvasModule, BsAccordionModule, BsToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasComponent {
  gitRepo = inject(GIT_REPO);

  colors = Color;
  position = signal<Position>('start');
  offcanvasVisible = signal(false);
  sidebarVisible = signal(false);
  showOffcanvas(position: Position) {
    this.position.set(position);
    this.offcanvasVisible.set(true);
  }
}
