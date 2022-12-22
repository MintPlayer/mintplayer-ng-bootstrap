import { Component, AfterViewInit } from '@angular/core';
import { LazyLoadedComponent } from './components/lazy-loaded/lazy-loaded.component';
import { LelyLoadedComponent } from './components/lely-loaded/lely-loaded.component';

@Component({
  selector: 'demo-lazy-loading',
  templateUrl: './lazy-loading.component.html',
  styleUrls: ['./lazy-loading.component.scss']
})
export class LazyLoadingComponent implements AfterViewInit {
  lazyLoaded?: Promise<typeof LazyLoadedComponent>;
  lelyLoaded?: Promise<typeof LelyLoadedComponent>;
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.lazyLoaded = import('./components/lazy-loaded/lazy-loaded.component')
        .then(({ LazyLoadedComponent }) => LazyLoadedComponent);
      
      this.lelyLoaded = import('./components/lely-loaded/lely-loaded.component')
        .then(({ LelyLoadedComponent }) => LelyLoadedComponent);
    }, 5000);
  }
}
