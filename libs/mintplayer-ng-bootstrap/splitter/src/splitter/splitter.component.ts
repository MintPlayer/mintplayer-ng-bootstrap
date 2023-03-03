import { Component, ContentChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { BsSplitPanelComponent } from '../split-panel/split-panel.component';

@Component({
  selector: 'bs-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
})
export class BsSplitterComponent {
  @ContentChildren(BsSplitPanelComponent) panels!: QueryList<BsSplitPanelComponent>;
}
