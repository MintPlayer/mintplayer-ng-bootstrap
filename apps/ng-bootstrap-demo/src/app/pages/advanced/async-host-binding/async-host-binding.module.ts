import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

import { AsyncHostBindingRoutingModule } from './async-host-binding-routing.module';
import { AsyncHostBindingComponent, HelloComponent } from './async-host-binding.component';


@NgModule({
  declarations: [
    AsyncHostBindingComponent,
    HelloComponent
  ],
  imports: [
    CommonModule,
    BsAlertModule,
    // BsAsyncHostBindingModule, // Should be loaded in the AppModule
    AsyncHostBindingRoutingModule
  ]
})
export class AsyncHostBindingModule { }
