import { CdkDragEnter } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Component({
  selector: 'bs-dock-region',
  templateUrl: './dock-region.component.html',
  styleUrls: ['./dock-region.component.scss'],
})
export class BsDockRegionComponent {
  constructor() {
    this.background$ = this.isDragHover$.pipe(map((isDragHover) => {
      return isDragHover ? 'bg-danger' : 'bg-dark';
    }));
  }

  isDragHover$ = new BehaviorSubject<boolean>(false);
  background$: Observable<string>;
  
  onEnter() {
    this.isDragHover$.next(true);
  }
  onLeave() {
    this.isDragHover$.next(false);
  }

  onDockPanelDropEnter(ev: CdkDragEnter<any, any>) {
    console.log('Entered with a panel', ev);

    // StackBlitz with Drag-drop:
    // https://stackblitz.com/edit/angular-xa6byy
    // StackBlitz with Attachable DomPortal
    // https://stackblitz.com/edit/angular-zq6i8e
    // Desired result:
    // https://www.npmjs.com/package/igniteui-dockmanager
  }
}
