import { Component, Inject } from '@angular/core';
import { BsViewState } from '@mintplayer/ng-bootstrap';
import { OffcanvasPosition } from '@mintplayer/ng-bootstrap/offcanvas';
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
  
  position$ = new BehaviorSubject<OffcanvasPosition>('start');
  offcanvasState: BsViewState = 'closed';
  sidebarState: BsViewState = 'closed';
  
  gitRepo: string;
  showOffcanvas(position: OffcanvasPosition) {
    this.position$.next(position);
    setTimeout(() => this.offcanvasState = 'open', 50);
  }
}
