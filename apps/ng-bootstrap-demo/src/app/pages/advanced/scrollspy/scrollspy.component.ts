import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  imports: [
    BsButtonTypeDirective,
    BsCloseComponent,
    BsModalHostComponent,
    BsModalDirective,
    BsModalHeaderDirective,
    BsModalBodyDirective,
    BsModalCloseDirective,
    BsScrollspyComponent,
    BsScrollspyDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollspyComponent {
  readonly colors = Color;
  readonly isModalOpen = signal(false);
}
