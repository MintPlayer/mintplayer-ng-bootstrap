import { Component, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'demo-lely-loaded',
  templateUrl: './lely-loaded.component.html',
  styleUrls: ['./lely-loaded.component.scss']
})
export class LelyLoadedComponent {
  text = 'Lely-loaded';
}

@NgModule({
  declarations: [LelyLoadedComponent],
  imports: [FormsModule, BrowserAnimationsModule]
})
export class LelyLoadedComponentModule {}
