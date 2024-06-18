import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCheckGroupDirective } from './check-group.directive';
import { BsCheckGroupValueAccessor } from './check-group-accessor.directive';

@NgModule({
  declarations: [BsCheckGroupDirective, BsCheckGroupValueAccessor],
  imports: [CommonModule],
  exports: [BsCheckGroupDirective, BsCheckGroupValueAccessor]
})
export class BsCheckGroupModule { }
