import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTypeaheadMockComponent } from './typeahead/typeahead.component';

@NgModule({
  declarations: [BsTypeaheadMockComponent],
  imports: [CommonModule],
  exports: [BsTypeaheadMockComponent],
})
export class BsTypeaheadTestingModule {}
