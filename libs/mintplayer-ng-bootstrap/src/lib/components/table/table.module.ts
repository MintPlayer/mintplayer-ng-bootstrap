import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTableComponent } from './component/table.component';

@NgModule({
  declarations: [BsTableComponent],
  imports: [CommonModule],
  exports: [BsTableComponent],
})
export class BsTableModule {}
