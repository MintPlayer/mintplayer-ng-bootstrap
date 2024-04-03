import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';

@Component({
  selector: 'demo-trust-html',
  templateUrl: './trust-html.component.html',
  styleUrls: ['./trust-html.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridModule, BsTrustHtmlPipe]
})
export class TrustHtmlComponent {
  html = '';
}
