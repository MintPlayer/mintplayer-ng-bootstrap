import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'copy', loadChildren: () => import('../advanced/copy/copy.module').then(m => m.CopyModule) },
  { path: 'file-upload', loadChildren: () => import('../advanced/file-upload/file-upload.module').then(m => m.FileUploadModule) },
  { path: 'datatables', loadChildren: () => import('./datatables/datatables.module').then(m => m.DatatablesModule) },
  { path: 'select2', loadChildren: () => import('./select2/select2.module').then(m => m.Select2Module) },
  { path: 'autofocus', loadChildren: () => import('./autofocus/autofocus.module').then(m => m.AutofocusModule) },
  { path: 'scrollspy', loadChildren: () => import('./scrollspy/scrollspy.module').then(m => m.ScrollspyModule) },
  { path: 'code-snippet', loadChildren: () => import('./code-snippet/code-snippet.module').then(m => m.CodeSnippetModule) },
  { path: 'scheduler', loadChildren: () => import('./scheduler/scheduler.module').then(m => m.SchedulerModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdvancedRoutingModule { }
