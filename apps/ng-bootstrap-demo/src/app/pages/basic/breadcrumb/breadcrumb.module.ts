import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBreadcrumbModule } from '@mintplayer/ng-bootstrap/breadcrumb';

import { BreadcrumbRoutingModule } from './breadcrumb-routing.module';
import { BreadcrumbComponent } from './breadcrumb.component';


@NgModule({
  declarations: [
    BreadcrumbComponent
  ],
  imports: [
    CommonModule,
    BsBreadcrumbModule,
    BreadcrumbRoutingModule
  ]
})
export class BreadcrumbModule { }
