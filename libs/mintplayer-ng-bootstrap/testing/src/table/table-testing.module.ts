import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTableMockComponent } from './table/table.component';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';

@NgModule({
  declarations: [BsTableMockComponent],
  imports: [CommonModule],
  exports: [BsTableMockComponent],
  providers: [
    { provide: BsTableComponent, useExisting: BsTableMockComponent },
  ]
})
export class BsTableTestingModule {}
