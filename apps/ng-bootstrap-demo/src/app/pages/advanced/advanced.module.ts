import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdvancedRoutingModule } from './advanced-routing.module';
import { AdvancedComponent } from './advanced.component';


@NgModule({
  declarations: [
    AdvancedComponent
  ],
  imports: [
    CommonModule,
    AdvancedRoutingModule
  ]
})
export class AdvancedModule { }
