import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDockManagerComponent } from './components/dock-manager.component';
import { BsDockPaneComponent } from './components/dock-pane.component';

@NgModule({
  declarations: [BsDockManagerComponent, BsDockPaneComponent],
  imports: [CommonModule],
  exports: [BsDockManagerComponent, BsDockPaneComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsDockModule {}
