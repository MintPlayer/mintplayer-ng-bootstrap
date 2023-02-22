import { Component, ContentChild, TemplateRef, Input } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { BsTabControlComponent } from '../tab-control/tab-control.component';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})
export class BsTabPageComponent {

  constructor(tabControl: BsTabControlComponent) {
    this.tabControl = tabControl;
    this.tabId$ = new BehaviorSubject<number>(++this.tabControl.tabCounter);
    this.tabName$ = combineLatest([this.tabControl.tabControlName$, this.tabId$])
      .pipe(map(([tabControlName, tabId]) =>  `${tabControlName}-${tabId}`));
  }

  tabControl: BsTabControlComponent;
  tabId$: BehaviorSubject<number>;
  tabName$: Observable<string>;

  @Input() disabled = false;
  @ContentChild(TemplateRef) headerTemplate!: TemplateRef<any>;

}
