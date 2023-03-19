import { Component, ContentChildren, QueryList } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';

@Component({
  selector: 'bs-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class BsDockComponent {
  panels$ = new BehaviorSubject<BsDockPanelComponent[]>([]);
  @ContentChildren(BsDockPanelComponent) set panels(value: QueryList<BsDockPanelComponent>) {
    this.panels$.next(value.toArray());
  }

}
