import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridMockComponent } from './grid/grid.component';
import { BsRowMockDirective } from './row.directive';
import { BsColumnMockDirective } from './column.directive';
import { BsGridComponent } from '@mintplayer/ng-bootstrap/grid';

@NgModule({
  declarations: [BsGridMockComponent, BsRowMockDirective, BsColumnMockDirective],
  imports: [CommonModule],
  exports: [BsGridMockComponent, BsRowMockDirective, BsColumnMockDirective],
  providers: [
    { provide: BsGridComponent, useClass: BsGridMockComponent }
  ]
})
export class BsGridTestingModule {}
