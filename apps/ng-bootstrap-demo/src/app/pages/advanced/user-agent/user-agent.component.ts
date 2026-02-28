import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsUserAgentDirective, BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-user-agent',
  templateUrl: './user-agent.component.html',
  styleUrls: ['./user-agent.component.scss'],
  imports: [BsAlertComponent, BsUserAgentDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAgentComponent {
  
  colors = Color;
  detectedUserAgent?: BsUserAgent;

  userAgentDetected(userAgent?: BsUserAgent) {
    this.detectedUserAgent = userAgent;
  }
}
