import { Component, ChangeDetectionStrategy} from '@angular/core';
import { LazyLoadedComponent } from './components/lazy-loaded/lazy-loaded.component';
import { AsyncPipe } from '@angular/common';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-lazy-loading',
  templateUrl: './lazy-loading.component.html',
  styleUrls: ['./lazy-loading.component.scss'],
  standalone: true,
  imports: [AsyncPipe, BsAlertComponent, LazyLoadedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyLoadingComponent {
  colors = Color;
}
