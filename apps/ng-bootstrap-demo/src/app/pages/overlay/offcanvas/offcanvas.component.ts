import { AsyncPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, Position } from '@mintplayer/ng-bootstrap';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  standalone: true,
  imports: [AsyncPipe, RouterLink, BsGridModule, BsCloseComponent, BsDropdownModule, BsButtonTypeDirective, BsButtonGroupComponent, BsDropdownMenuModule, BsOffcanvasModule, BsAccordionModule, BsCheckboxModule]
})
export class OffcanvasComponent {

  constructor(@Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }
  
  colors = Color;
  position$ = new BehaviorSubject<Position>('start');
  offcanvasVisible = false;
  sidebarVisible = false;
  
  gitRepo: string;
  showOffcanvas(position: Position) {
    this.position$.next(position);
    setTimeout(() => this.offcanvasVisible = true, 50);
  }
}
