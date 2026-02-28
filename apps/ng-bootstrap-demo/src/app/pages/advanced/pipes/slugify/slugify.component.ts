import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';

@Component({
  selector: 'demo-slugify',
  templateUrl: './slugify.component.html',
  styleUrls: ['./slugify.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsSlugifyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlugifyComponent {
  text = 'Hello world';
}
