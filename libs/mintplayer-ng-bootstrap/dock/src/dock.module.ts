import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsDockComponent } from './dock/dock.component';
import { BsDockPanelComponent } from './dock-panel/dock-panel.component';
import { BsDockPanelHeaderComponent } from './dock-panel-header/dock-panel-header.component';

@NgModule({
  declarations: [
    BsDockComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent
  ],
  imports: [
    CommonModule,
    PortalModule,
    BsCardModule,
    BsSplitterModule
  ],
  exports: [
    BsDockComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent
  ]
})
export class BsDockModule { }
