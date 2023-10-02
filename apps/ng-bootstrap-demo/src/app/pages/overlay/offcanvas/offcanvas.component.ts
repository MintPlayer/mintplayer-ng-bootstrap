import { Component, Inject } from '@angular/core';
import { Color, Position } from '@mintplayer/ng-bootstrap';
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
  offcanvasVisible = false;
  sidebarVisible = false;
  
  gitRepo: string;
  showOffcanvas(position: Position) {
    this.position$.next(position);
    setTimeout(() => this.offcanvasVisible = true, 50);
  }
}
