import { Component, ContentChild, Input, ElementRef, signal, computed } from '@angular/core';
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
    this.tabId = signal<number>(++this.tabControl.tabCounter);
    this.tabName = computed(() => `${this.tabControl.tabControlName()}-${this.tabId()}`);
  }

  element: ElementRef<any>;
  tabControl: BsTabControlComponent;
  tabId;
  tabName;

  @Input() disabled = false;
  @ContentChild(BsTabPageHeaderDirective) headerTemplate!: BsTabPageHeaderDirective;

}
