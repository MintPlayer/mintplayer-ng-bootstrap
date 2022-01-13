import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodeSnippetComponent } from './code-snippet.component';

const routes: Routes = [{ path: '', component: CodeSnippetComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CodeSnippetRoutingModule { }
