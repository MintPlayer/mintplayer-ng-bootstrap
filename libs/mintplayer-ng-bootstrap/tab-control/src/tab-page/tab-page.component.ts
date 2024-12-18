import { Component, ContentChild, TemplateRef, Input, ElementRef } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss'],
  standalone: false,
})
export class BsTabPageComponent {

  constructor(tabControl: BsTabControlComponent, element: ElementRef<any>) {
    this.element = element;
    this.tabControl = tabControl;
    this.tabId$ = new BehaviorSubject<number>(++this.tabControl.tabCounter);
    this.tabName$ = combineLatest([this.tabControl.tabControlName$, this.tabId$])
      .pipe(map(([tabControlName, tabId]) =>  `${tabControlName}-${tabId}`));
  }

  element: ElementRef<any>;
  tabControl: BsTabControlComponent;
  tabId$: BehaviorSubject<number>;
  tabName$: Observable<string>;

  @Input() disabled = false;
  @ContentChild(BsTabPageHeaderDirective) headerTemplate!: BsTabPageHeaderDirective;

}
