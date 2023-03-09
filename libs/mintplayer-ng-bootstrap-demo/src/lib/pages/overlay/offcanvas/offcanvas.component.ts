import { Component, Inject } from '@angular/core';
import { BsViewState, Color, Position } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss']
})
export class OffcanvasComponent {

  constructor(@Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }
  
  colors = Color;
  position$ = new BehaviorSubject<Position>('start');
  offcanvasState: BsViewState = 'closed';
  sidebarState: BsViewState = 'closed';
  
  gitRepo: string;
  showOffcanvas(position: Position) {
    this.position$.next(position);
    setTimeout(() => this.offcanvasState = 'open', 50);
  }
}
