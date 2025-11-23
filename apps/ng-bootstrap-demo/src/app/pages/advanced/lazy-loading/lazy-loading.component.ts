import { Component } from '@angular/core';
import { LazyLoadedComponent } from './components/lazy-loaded/lazy-loaded.component';
import { AsyncPipe } from '@angular/common';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-lazy-loading',
  templateUrl: './lazy-loading.component.html',
  styleUrls: ['./lazy-loading.component.scss'],
  imports: [AsyncPipe, BsAlertComponent, BsAlertCloseComponent, LazyLoadedComponent]
})
export class LazyLoadingComponent {
  colors = Color;
}
