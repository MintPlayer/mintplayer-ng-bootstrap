import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';

@Component({
  selector: 'demo-trust-html',
  templateUrl: './trust-html.component.html',
  styleUrls: ['./trust-html.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTrustHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustHtmlComponent {
  html = '';
}
