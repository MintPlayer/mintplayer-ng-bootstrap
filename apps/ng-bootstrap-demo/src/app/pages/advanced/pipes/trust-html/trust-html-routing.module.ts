import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrustHtmlComponent } from './trust-html.component';

const routes: Routes = [{ path: '', component: TrustHtmlComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrustHtmlRoutingModule { }
