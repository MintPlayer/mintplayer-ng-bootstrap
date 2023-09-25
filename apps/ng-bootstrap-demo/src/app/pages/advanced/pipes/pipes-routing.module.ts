import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'trust-html', loadChildren: () => import('./trust-html/trust-html.module').then(m => m.TrustHtmlModule) },
  { path: 'split-string', loadChildren: () => import('./split-string/split-string.module').then(m => m.SplitStringModule) },
  { path: 'slugify', loadChildren: () => import('./slugify/slugify.module').then(m => m.SlugifyModule) },
  { path: 'word-count', loadChildren: () => import('./word-count/word-count.module').then(m => m.WordCountModule) },
  { path: 'font-color', loadChildren: () => import('./font-color/font-color.module').then(m => m.FontColorModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PipesRoutingModule { }
