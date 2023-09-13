import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SlugifyComponent } from './slugify.component';

const routes: Routes = [{ path: '', component: SlugifyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SlugifyRoutingModule { }
