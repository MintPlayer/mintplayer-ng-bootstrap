import { Component, ContentChild, TemplateRef, Input, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BehaviorSubject, combineLatest, map, Observable, of } from 'rxjs';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})
export class BsTabPageComponent {

  constructor(@Inject(PLATFORM_ID) platformId: Object, tabControl: BsTabControlComponent, element: ElementRef<any>) {
    this.element = element;
    this.tabControl = tabControl;
    this.isServerSide = isPlatformServer(platformId);
    this.tabId$ = new BehaviorSubject<number>(++this.tabControl.tabCounter);
    this.tabName$ = combineLatest([this.tabControl.tabControlName$, this.tabId$])
      .pipe(map(([tabControlName, tabId]) =>  `${tabControlName}-${tabId}`));
    this.isSelected$ = tabControl.activeTab$.pipe(map(activeTab => activeTab === this));
    this.dBlockClass$ = this.isSelected$.pipe(map((isSelected) => {
      if (this.isServerSide) {
        return false;
      } else {
        return isSelected;
      }
    }));
  }

  element: ElementRef<any>;
  tabControl: BsTabControlComponent;
  tabId$: BehaviorSubject<number>;
  tabName$: Observable<string>;
  isSelected$: Observable<boolean>;
  dBlockClass$: Observable<boolean>;
  isServerSide: boolean;

  @Input() disabled = false;
  @ContentChild(BsTabPageHeaderDirective) headerTemplate!: BsTabPageHeaderDirective;

}
