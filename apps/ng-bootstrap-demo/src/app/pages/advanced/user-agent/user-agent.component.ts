import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsUserAgentDirective, BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-user-agent',
  templateUrl: './user-agent.component.html',
  styleUrls: ['./user-agent.component.scss'],
  standalone: true,
  imports: [BsAlertComponent, BsAlertCloseComponent, BsUserAgentDirective]
})
export class UserAgentComponent {
  
  colors = Color;
  detectedUserAgent?: BsUserAgent;

  userAgentDetected(userAgent?: BsUserAgent) {
    this.detectedUserAgent = userAgent;
  }
}
