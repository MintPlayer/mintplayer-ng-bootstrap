import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdditionalSamplesRoutingModule } from './additional-samples-routing.module';
import { AdditionalSamplesComponent } from './additional-samples.component';


@NgModule({
  declarations: [
    AdditionalSamplesComponent
  ],
  imports: [
    CommonModule,
    AdditionalSamplesRoutingModule
  ]
})
export class AdditionalSamplesModule { }
