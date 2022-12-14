import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSelectMockComponent } from './component/select.component';
import { BsSelectMockValueAccessor } from './directives/select-value-accessor.directive';
import { BsSelectOptionMock } from './directives/select-option.directive';

@NgModule({
  declarations: [BsSelectMockComponent, BsSelectMockValueAccessor, BsSelectOptionMock],
  imports: [CommonModule],
  exports: [BsSelectMockComponent, BsSelectMockValueAccessor, BsSelectOptionMock],
})
export class BsSelectTestingModule {}
