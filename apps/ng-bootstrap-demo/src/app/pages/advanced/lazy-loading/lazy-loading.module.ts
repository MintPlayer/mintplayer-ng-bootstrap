import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsLazyLoadingModule } from '@mintplayer/ng-bootstrap/lazy-loading';

import { LazyLoadingRoutingModule } from './lazy-loading-routing.module';
import { LazyLoadingComponent } from './lazy-loading.component';


@NgModule({
  declarations: [
    LazyLoadingComponent
  ],
  imports: [
    CommonModule,
    BsLazyLoadingModule,
    LazyLoadingRoutingModule
  ]
})
export class LazyLoadingModule { }
