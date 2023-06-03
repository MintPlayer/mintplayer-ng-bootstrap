import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignaturePadComponent } from './signature-pad.component';

const routes: Routes = [{ path: '', component: SignaturePadComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SignaturePadRoutingModule { }
