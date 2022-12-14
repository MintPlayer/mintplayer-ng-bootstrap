import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UcFirstMockPipe } from './uc-first.pipe';
import { UcFirstPipe } from '@mintplayer/ng-bootstrap';

@NgModule({
  declarations: [
    UcFirstMockPipe
  ],
  imports: [
    CommonModule
  ],
  providers: [
    { provide: UcFirstPipe, useClass: UcFirstMockPipe }
  ],
  exports: [
    UcFirstMockPipe
  ],
})
export class UcFirstTestingModule { }
