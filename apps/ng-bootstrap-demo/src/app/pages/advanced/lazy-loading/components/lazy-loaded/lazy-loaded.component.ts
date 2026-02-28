import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'demo-lazy-loaded',
  templateUrl: './lazy-loaded.component.html',
  styleUrls: ['./lazy-loaded.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyLoadedComponent {
  text = 'Lazy-loaded';
}