import { Component, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'demo-lazy-loaded',
  templateUrl: './lazy-loaded.component.html',
  styleUrls: ['./lazy-loaded.component.scss']
})
export class LazyLoadedComponent {
  text = 'Lazy-loaded';
}

@NgModule({
  declarations: [LazyLoadedComponent],
  imports: [FormsModule, BrowserAnimationsModule]
})
export class LazyLoadedComponentModule {}