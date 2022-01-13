import { Component, Inject } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent {
  constructor(@Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }

  gitRepo: string;
  tooltipPosition = Position;

}
