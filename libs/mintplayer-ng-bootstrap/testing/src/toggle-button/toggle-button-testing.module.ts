import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToggleButtonMockComponent } from './toggle-button/toggle-button.component';
import { BsToggleButtonGroupMockDirective } from './directives/toggle-button-group.directive';
import { BsToggleButtonMockValueAccessor } from './directives/toggle-button-value-accessor.directive';

@NgModule({
  declarations: [BsToggleButtonMockComponent, BsToggleButtonGroupMockDirective, BsToggleButtonMockValueAccessor],
  imports: [CommonModule],
  exports: [BsToggleButtonMockComponent, BsToggleButtonGroupMockDirective, BsToggleButtonMockValueAccessor],
})
export class BsToggleButtonTestingModule {}
