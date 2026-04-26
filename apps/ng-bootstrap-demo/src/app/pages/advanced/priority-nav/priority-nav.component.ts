import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsPriorityNavComponent, BsPriorityNavItemDirective } from '@mintplayer/ng-bootstrap/priority-nav';
import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';

@Component({
  selector: 'demo-priority-nav',
  templateUrl: './priority-nav.component.html',
  styleUrls: ['./priority-nav.component.scss'],
  imports: [
    BsPriorityNavComponent,
    BsPriorityNavItemDirective,
    BsResizableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityNavComponent {
  links = [
    { label: 'Home',     priority: 1, hideBelow: 'sm' as const },
    { label: 'Products', priority: 2, hideBelow: 'md' as const },
    { label: 'Services', priority: 3, hideBelow: 'md' as const },
    { label: 'Pricing',  priority: 4, hideBelow: 'lg' as const },
    { label: 'Blog',     priority: 5, hideBelow: 'lg' as const },
    { label: 'Careers',  priority: 6, hideBelow: 'xl' as const },
    { label: 'Support',  priority: 7, hideBelow: 'xl' as const },
    { label: 'Contact',  priority: 8, hideBelow: 'xl' as const },
  ];
}
