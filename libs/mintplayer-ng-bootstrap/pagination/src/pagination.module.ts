import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsPaginationComponent } from './component/pagination/pagination.component';



@NgModule({
  declarations: [
    BsPaginationComponent
  ],
  imports: [
    CommonModule,
    BsTrackByModule
  ],
  exports: [
    BsPaginationComponent
  ]
})
export class BsPaginationModule { }
