import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTooltipDirective, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  gitRepo = inject(GIT_REPO);
  colors = Color;
}
