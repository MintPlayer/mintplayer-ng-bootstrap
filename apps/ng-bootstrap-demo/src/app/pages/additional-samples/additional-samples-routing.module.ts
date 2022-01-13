import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdditionalSamplesComponent } from './additional-samples.component';

const routes: Routes = [{ path: '', component: AdditionalSamplesComponent }, { path: 'collapse', loadChildren: () => import('./collapse/collapse.module').then(m => m.CollapseModule) }, { path: 'range', loadChildren: () => import('./range/range.module').then(m => m.RangeModule) }, { path: 'floating-labels', loadChildren: () => import('./floating-labels/floating-labels.module').then(m => m.FloatingLabelsModule) }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdditionalSamplesRoutingModule { }
