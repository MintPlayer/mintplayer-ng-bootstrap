import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResizableComponent } from './resizable.component';

const routes: Routes = [{ path: '', component: ResizableComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResizableRoutingModule { }
