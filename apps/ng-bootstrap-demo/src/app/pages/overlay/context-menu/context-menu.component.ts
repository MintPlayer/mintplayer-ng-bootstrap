import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsContextMenuDirective } from '@mintplayer/ng-bootstrap/context-menu';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

@Component({
  selector: 'demo-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  imports: [BsDropdownMenuComponent, BsDropdownItemComponent, BsContextMenuDirective, BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {}
