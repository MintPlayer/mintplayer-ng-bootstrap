import { Component, Inject } from '@angular/core';
import { BsViewState, OffcanvasPosition } from '@mintplayer/ng-bootstrap';
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
