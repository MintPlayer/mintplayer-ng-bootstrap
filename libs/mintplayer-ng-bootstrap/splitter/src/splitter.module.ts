import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { BsSplitterComponent } from './splitter/splitter.component';
import { BsSplitPanelComponent } from './split-panel/split-panel.component';

@NgModule({
  declarations: [BsSplitterComponent, BsSplitPanelComponent],
  imports: [CommonModule, PortalModule, BsLetModule],
  exports: [BsSplitterComponent, BsSplitPanelComponent],
})
export class BsSplitterModule {}
