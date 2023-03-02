import { CdkDragEnter } from '@angular/cdk/drag-drop';
import { DomPortal } from '@angular/cdk/portal';
import { Component, HostBinding } from '@angular/core';
import { BehaviorSubject, Observable, map, combineLatest } from 'rxjs';
import { BsDockService } from '../dock-service/dock.service';

@Component({
  selector: 'bs-dock-region',
  templateUrl: './dock-region.component.html',
  styleUrls: ['./dock-region.component.scss'],
})
export class BsDockRegionComponent {
  constructor(dockService: BsDockService) {
    this.dockService = dockService;
    this.background$ = combineLatest([this.dockService.currentDraggedPanel$, this.isDragHover$])
      .pipe(map(([dockPanel, isDragHover]) => {
        return (!!dockPanel && isDragHover) ? 'bg-danger' : 'bg-dark';
      }));
  }

  dockService: BsDockService;
  isDragHover$ = new BehaviorSubject<boolean>(false);
  background$: Observable<string>;
  dockContent!: DomPortal;
  @HostBinding('class.position-relative') positionRelativeClass = true;
  
  onEnter(ev: Event) {
    this.isDragHover$.next(true);
    this.dockService.currentHoveredRegion$.next(this);
    console.log('Entered with a panel', ev);

    // StackBlitz with Drag-drop:
    // https://stackblitz.com/edit/angular-xa6byy
    // StackBlitz with Attachable DomPortal
    // https://stackblitz.com/edit/angular-z1twdj
    // Desired result:
    // https://www.npmjs.com/package/igniteui-dockmanager
  }

  onLeave() {
    this.isDragHover$.next(false);
    this.dockService.currentHoveredRegion$.next(null);
  }

}
