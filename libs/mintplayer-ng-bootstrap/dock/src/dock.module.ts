import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsDockContainerComponent } from './dock-container/dock-container.component';
import { BsDockPanelComponent } from './dock-panel/dock-panel.component';
import { BsDockPanelHeaderComponent } from './dock-panel-header/dock-panel-header.component';
import { BsDockRegionComponent } from './dock-region/dock-region.component';

@NgModule({
  declarations: [
    BsDockContainerComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
    BsDockRegionComponent,
  ],
  imports: [
    CommonModule,
    PortalModule,
    BsIconModule,
    BsButtonTypeModule
  ],
  exports: [
    BsDockContainerComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
    BsDockRegionComponent,
  ],
})
export class BsDockModule {}
