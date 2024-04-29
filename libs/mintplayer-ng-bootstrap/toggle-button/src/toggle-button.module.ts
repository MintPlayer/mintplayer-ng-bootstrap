import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsToggleButtonComponent } from './component/toggle-button.component';
import { BsToggleButtonValueAccessor } from './value-accessor/toggle-button-value-accessor';
import { BsToggleButtonGroupDirective } from './directives/toggle-button-group/toggle-button-group.directive';

@NgModule({
  declarations: [
    BsToggleButtonComponent,
    BsToggleButtonValueAccessor,
    BsToggleButtonGroupDirective
  ],
  imports: [
    CommonModule,
    BsFormCheckComponent
  ],
  exports: [
    BsToggleButtonComponent,
    BsToggleButtonValueAccessor,
    BsToggleButtonGroupDirective
  ]
})
export class BsToggleButtonModule { }
