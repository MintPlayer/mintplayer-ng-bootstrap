import { NgModule } from '@angular/core';
import { BsBreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { BsBreadcrumbItemComponent } from './breadcrumb-item/breadcrumb-item.component';

@NgModule({
  declarations: [BsBreadcrumbComponent, BsBreadcrumbItemComponent],
  exports: [BsBreadcrumbComponent, BsBreadcrumbItemComponent],
})
export class BsBreadcrumbModule {}
