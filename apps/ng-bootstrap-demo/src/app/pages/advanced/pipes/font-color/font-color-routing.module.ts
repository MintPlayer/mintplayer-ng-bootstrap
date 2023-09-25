import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FontColorComponent } from './font-color.component';

const routes: Routes = [{ path: '', component: FontColorComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FontColorRoutingModule { }
