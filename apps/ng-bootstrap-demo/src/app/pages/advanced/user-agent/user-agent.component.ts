import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsUserAgentDirective, BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-user-agent',
  templateUrl: './user-agent.component.html',
  styleUrls: ['./user-agent.component.scss'],
  standalone: true,
  imports: [BsAlertModule, BsUserAgentDirective]
})
export class UserAgentComponent {
  
  colors = Color;
  detectedUserAgent?: BsUserAgent;

  userAgentDetected(userAgent?: BsUserAgent) {
    this.detectedUserAgent = userAgent;
  }
}
