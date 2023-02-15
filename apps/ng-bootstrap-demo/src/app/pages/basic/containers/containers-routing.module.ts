import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'grid', loadChildren: () => import('./grid/grid.module').then(m => m.GridModule) },
  { path: 'card', loadChildren: () => import('./card/card.module').then(m => m.CardModule) },
  { path: 'tab-control', loadChildren: () => import('./tab-control/tab-control.module').then(m => m.TabControlModule) },
  { path: 'accordion', loadChildren: () => import('./accordion/accordion.module').then(m => m.AccordionModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContainersRoutingModule { }
