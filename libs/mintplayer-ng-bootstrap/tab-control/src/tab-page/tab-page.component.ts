import { Component, ContentChild, TemplateRef, Input, ElementRef, inject } from '@angular/core';
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

  element = inject(ElementRef<any>);
  tabControl = inject(BsTabControlComponent);
  tabId$ = new BehaviorSubject<number>(++this.tabControl.tabCounter);
  tabName$ = combineLatest([this.tabControl.tabControlName$, this.tabId$])
    .pipe(map(([tabControlName, tabId]) =>  `${tabControlName}-${tabId}`));

  @Input() disabled = false;
  @ContentChild(BsTabPageHeaderDirective) headerTemplate!: BsTabPageHeaderDirective;

}
