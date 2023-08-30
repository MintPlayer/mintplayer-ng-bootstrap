import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'copy', loadChildren: () => import('../advanced/copy/copy.module').then(m => m.CopyModule) },
  { path: 'file-upload', loadChildren: () => import('../advanced/file-upload/file-upload.module').then(m => m.FileUploadModule) },
  { path: 'datatables', loadChildren: () => import('./datatables/datatables.module').then(m => m.DatatablesModule) },
  { path: 'select2', loadChildren: () => import('./select2/select2.module').then(m => m.Select2Module) },
  { path: 'autofocus', loadChildren: () => import('./autofocus/autofocus.module').then(m => m.AutofocusModule) },
  { path: 'scrollspy', loadChildren: () => import('./scrollspy/scrollspy.module').then(m => m.ScrollspyModule) },
  { path: 'code-snippet', loadChildren: () => import('./code-snippet/code-snippet.module').then(m => m.CodeSnippetModule) },
  { path: 'scheduler', loadChildren: () => import('./scheduler/scheduler.module').then(m => m.SchedulerModule) },
  { path: 'user-agent', loadChildren: () => import('./user-agent/user-agent.module').then(m => m.UserAgentModule) },
  { path: 'lazy-loading-components', loadChildren: () => import('./lazy-loading/lazy-loading.module').then(m => m.LazyLoadingModule) },
  { path: 'ordinal-number', loadChildren: () => import('./ordinal-number/ordinal-number.module').then(m => m.OrdinalNumberModule) },
  { path: 'markdown', loadChildren: () => import('./markdown/markdown.module').then(m => m.MarkdownModule) },
  { path: 'navigation-lock', loadChildren: () => import('./navigation-lock/navigation-lock.module').then(m => m.NavigationLockModule) },
  { path: 'splitter', loadChildren: () => import('./splitter/splitter.module').then(m => m.SplitterModule) },
  { path: 'dock', loadChildren: () => import('./dock/dock.module').then(m => m.DockModule) },
  { path: 'instance-of', loadChildren: () => import('./instance-of/instance-of.module').then(m => m.InstanceOfModule) },
  { path: 'resizable', loadChildren: () => import('./resizable/resizable.module').then(m => m.ResizableModule) },
  { path: 'signature-pad', loadChildren: () => import('./signature-pad/signature-pad.module').then(m => m.SignaturePadModule) },
  { path: 'async-host-binding', loadChildren: () => import('./async-host-binding/async-host-binding.module').then(m => m.AsyncHostBindingModule) },
  { path: 'svg', loadChildren: () => import('./svg/svg.module').then(m => m.SvgModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdvancedRoutingModule { }
