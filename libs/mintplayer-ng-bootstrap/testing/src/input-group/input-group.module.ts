import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsInputGroupMockComponent } from './component/input-group.component';

@NgModule({
  declarations: [BsInputGroupMockComponent],
  imports: [CommonModule],
  exports: [BsInputGroupMockComponent],
  providers: [
    { provide: BsInputGroupComponent, useClass: BsInputGroupMockComponent },
  ],
})
export class BsInputGroupTestingModule {}
