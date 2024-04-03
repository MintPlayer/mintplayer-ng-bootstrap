import { NgModule } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsLetDirective } from '@mintplayer/ng-bootstrap/let';
import { BsUserAgentDirective } from '@mintplayer/ng-bootstrap/user-agent';
import { BsSplitterComponent } from './splitter/splitter.component';
import { BsSplitPanelComponent } from './split-panel/split-panel.component';
import { BsElementAtPipe } from './element-at/element-at.pipe';

@NgModule({
  declarations: [BsSplitterComponent, BsSplitPanelComponent, BsElementAtPipe],
  imports: [AsyncPipe, PortalModule, BsLetDirective, BsUserAgentDirective],
  exports: [BsSplitterComponent, BsSplitPanelComponent, BsElementAtPipe],
})
export class BsSplitterModule {}
