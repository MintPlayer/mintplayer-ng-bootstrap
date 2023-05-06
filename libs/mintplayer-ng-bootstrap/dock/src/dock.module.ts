import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsResizableModule } from '@mintplayer/ng-bootstrap/resizable';
import { BsTabControlModule } from '@mintplayer/ng-bootstrap/tab-control';
import { BsInstanceOfModule } from '@mintplayer/ng-bootstrap/instance-of';
import { BsDockComponent } from './dock/dock.component';
import { BsDockPanelComponent } from './dock-panel/dock-panel.component';
import { BsDockPanelHeaderComponent } from './dock-panel-header/dock-panel-header.component';
import { BsDockPaneRendererComponent } from './dock-pane-renderer/dock-pane-renderer.component';
import { BsDockRegionZoneDirective } from './dock-region-zone/dock-region-zone.directive';

@NgModule({
  declarations: [
    BsDockComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
    BsDockPaneRendererComponent,
    BsDockRegionZoneDirective,
  ],
  imports: [
    CommonModule,
    PortalModule,
    BsCardModule,
    BsInstanceOfModule,
    BsSplitterModule,
    BsTabControlModule,
    BsResizableModule,
  ],
  exports: [
    BsDockComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
    BsDockPaneRendererComponent,
    BsDockRegionZoneDirective,
  ],
})
export class BsDockModule {}
