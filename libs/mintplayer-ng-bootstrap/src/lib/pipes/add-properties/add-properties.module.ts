import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAddPropertiesPipe } from './add-properties.pipe';



@NgModule({
  declarations: [
    BsAddPropertiesPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsAddPropertiesPipe
  ]
})
export class BsAddPropertiesModule { }
