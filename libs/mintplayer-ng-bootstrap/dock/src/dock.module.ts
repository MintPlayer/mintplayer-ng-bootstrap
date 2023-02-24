import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsDockContainerComponent } from './dock-container/dock-container.component';
import { BsDockPanelComponent } from './dock-panel/dock-panel.component';
import { BsDockPanelHeaderComponent } from './dock-panel-header/dock-panel-header.component';

@NgModule({
  declarations: [
    BsDockContainerComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
  ],
  imports: [
    CommonModule,
    DragDropModule,
    BsIconModule,
    BsButtonTypeModule
  ],
  exports: [
    BsDockContainerComponent,
    BsDockPanelComponent,
    BsDockPanelHeaderComponent,
  ],
})
export class BsDockModule {}
