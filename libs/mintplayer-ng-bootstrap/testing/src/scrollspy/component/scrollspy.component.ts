import { Component, ContentChildren, Input, QueryList } from '@angular/core';
import { BsScrollspyComponent } from '@mintplayer/ng-bootstrap/scrollspy';
import { BsScrollspyMockDirective } from '../directive/scrollspy.directive';

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  providers: [
    { provide: BsScrollspyComponent, useExisting: BsScrollspyMockComponent },
  ]
})
export class BsScrollspyMockComponent {
  @Input() animation: 'slide' | 'fade' = 'slide';

  @ContentChildren(BsScrollspyMockDirective, { descendants: true })
  directives!: QueryList<BsScrollspyMockDirective>;
}
