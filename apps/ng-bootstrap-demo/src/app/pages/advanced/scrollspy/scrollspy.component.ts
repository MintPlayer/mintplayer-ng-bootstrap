import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsModalHostComponent, BsModalDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  imports: [
    BsButtonTypeDirective,
    BsModalHostComponent,
    BsModalDirective,
    BsScrollspyComponent,
    BsScrollspyDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollspyComponent {
  readonly colors = Color;
  readonly isModalOpen = signal(false);
}
