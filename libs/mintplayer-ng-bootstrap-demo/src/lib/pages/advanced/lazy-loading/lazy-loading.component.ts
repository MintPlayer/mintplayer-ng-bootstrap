import { Component, AfterViewInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

  lazyReady$ = new BehaviorSubject<boolean>(false);
  lelyReady$ = new BehaviorSubject<boolean>(false);
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.lazyLoaded = import('./components/lazy-loaded/lazy-loaded.component')
        .then(({ LazyLoadedComponent }) => {
          this.lazyReady$.next(true);
          return LazyLoadedComponent;
        });
      
      this.lelyLoaded = import('./components/lely-loaded/lely-loaded.component')
        .then(({ LelyLoadedComponent }) => {
          this.lelyReady$.next(true);
          return LelyLoadedComponent;
        });
    }, 5000);
  }
}
