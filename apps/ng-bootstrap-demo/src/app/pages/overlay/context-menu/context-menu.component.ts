import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsContextMenuModule } from '@mintplayer/ng-bootstrap/context-menu';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';

@Component({
  selector: 'demo-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  standalone: true,
  imports: [BsDropdownMenuModule, BsContextMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {}
