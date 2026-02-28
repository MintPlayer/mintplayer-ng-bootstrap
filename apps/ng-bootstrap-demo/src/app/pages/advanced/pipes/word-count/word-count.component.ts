import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';

@Component({
  selector: 'demo-word-count',
  templateUrl: './word-count.component.html',
  styleUrls: ['./word-count.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsWordCountPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCountComponent {
  text = 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Repellendus adipisci, nemo, similique ullam alias a error eveniet omnis ducimus aliquid numquam doloremque, necessitatibus dolores amet. Rem tenetur veritatis ut deserunt.';
}
