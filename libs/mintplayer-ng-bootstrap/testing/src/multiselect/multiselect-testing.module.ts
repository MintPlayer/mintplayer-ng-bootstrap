import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMultiselectMockComponent } from './multiselect/multiselect.component';
import { BsMultiselectComponent } from '@mintplayer/ng-bootstrap/multiselect';

@NgModule({
  declarations: [BsMultiselectMockComponent],
  imports: [CommonModule],
  exports: [BsMultiselectMockComponent],
  providers: [
    { provide: BsMultiselectComponent, useClass: BsMultiselectMockComponent },
  ]
})
export class BsMultiselectTestingModule {}
