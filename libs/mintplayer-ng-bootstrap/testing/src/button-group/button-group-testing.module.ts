import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonGroupMockComponent } from './button-group/button-group.component';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';

@NgModule({
  declarations: [BsButtonGroupMockComponent],
  imports: [CommonModule],
  exports: [BsButtonGroupMockComponent],
  providers: [
    { provide: BsButtonGroupComponent, useClass: BsButtonGroupMockComponent }
  ]
})
export class BsButtonGroupTestingModule {}
