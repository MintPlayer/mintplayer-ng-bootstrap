import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCloseMockComponent } from './close/close.component';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';

@NgModule({
  declarations: [BsCloseMockComponent],
  imports: [CommonModule],
  exports: [BsCloseMockComponent],
  providers: [
    { provide: BsCloseComponent, useClass: BsCloseMockComponent }
  ]
})
export class BsCloseTestingModule {}
