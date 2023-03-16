import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { BsUserAgentModule } from '@mintplayer/ng-bootstrap/user-agent';
import { BsSplitterComponent } from './splitter/splitter.component';
import { BsSplitPanelComponent } from './split-panel/split-panel.component';
import { BsElementAtPipe } from './element-at/element-at.pipe';

@NgModule({
  declarations: [BsSplitterComponent, BsSplitPanelComponent, BsElementAtPipe],
  imports: [CommonModule, PortalModule, BsLetModule, BsUserAgentModule],
  exports: [BsSplitterComponent, BsSplitPanelComponent, BsElementAtPipe],
})
export class BsSplitterModule {}
