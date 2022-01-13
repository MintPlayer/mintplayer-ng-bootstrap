import { Component, ContentChild, TemplateRef, Input } from '@angular/core';
import { BsTabControlComponent } from '../tab-control/tab-control.component';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})
export class BsTabPageComponent {

  tabControl: BsTabControlComponent;
  constructor(tabControl: BsTabControlComponent) {
    this.tabControl = tabControl;
  }

  @Input() disabled = false;
  @ContentChild(TemplateRef) headerTemplate!: TemplateRef<any>;

}
