import { DomPortal } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, take } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockRegionComponent } from '../dock-region/dock-region.component';

@Injectable({
  providedIn: 'root'
})
export class BsDockService {
  currentDraggedPanel$ = new BehaviorSubject<BsDockPanelComponent | null>(null);
  currentHoveredRegion$ = new BehaviorSubject<BsDockRegionComponent | null>(null);

  onDragEnd(panel: BsDockPanelComponent) {
    combineLatest([this.currentDraggedPanel$, this.currentHoveredRegion$])
      .pipe(take(1))
      .subscribe(([currentDraggedPanel, currentHoveredRegion]) => {
        if (currentHoveredRegion) {
          currentHoveredRegion.dockContent = new DomPortal(currentDraggedPanel?.element);
        }
      });

    this.currentDraggedPanel$.next(null);
    this.currentHoveredRegion$.next(null);
  }
}
