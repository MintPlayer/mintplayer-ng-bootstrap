import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config';


bootstrapApplication(AppComponent, config)
  .catch((err) => console.error(err));

  // Angular 21
  // Remove Zone.js
  // Signals / remove rxjs
  // Standalone components
  // Vite
  