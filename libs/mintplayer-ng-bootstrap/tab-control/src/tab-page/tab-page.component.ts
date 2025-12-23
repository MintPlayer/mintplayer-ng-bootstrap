import { ChangeDetectionStrategy, Component, ContentChild, computed, input, ElementRef, signal } from '@angular/core';
import { BsTabControlComponent } from '../tab-control/tab-control.component';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTabPageComponent {

  constructor(tabControl: BsTabControlComponent, element: ElementRef<any>) {
    this.element = element;
    this.tabControl = tabControl;
    this.tabId = signal(++this.tabControl.tabCounter);
  }

  element: ElementRef<any>;
  tabControl: BsTabControlComponent;
  tabId = signal<number>(0);
  tabName = computed(() => `${this.tabControl.tabControlName()}-${this.tabId()}`);

  disabled = input(false);
  @ContentChild(BsTabPageHeaderDirective) headerTemplate!: BsTabPageHeaderDirective;
}
