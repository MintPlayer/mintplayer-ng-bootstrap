import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPaginationMockComponent } from './pagination/pagination.component';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';

@NgModule({
  declarations: [BsPaginationMockComponent],
  imports: [CommonModule],
  exports: [BsPaginationMockComponent],
  providers: [
    { provide: BsPaginationComponent, useClass: BsPaginationMockComponent },
  ]
})
export class BsPaginationTestingModule {}
