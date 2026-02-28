import { ChangeDetectionStrategy, Component, contentChild, computed, inject, input, ElementRef, signal } from '@angular/core';
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
  element = inject(ElementRef);
  tabControl = inject(BsTabControlComponent);

  constructor() {
    this.tabId = signal(++this.tabControl.tabCounter);
  }
  tabId = signal<number>(0);
  tabName = computed(() => `${this.tabControl.tabControlName()}-${this.tabId()}`);

  disabled = input(false);
  readonly headerTemplate = contentChild(BsTabPageHeaderDirective);
}
