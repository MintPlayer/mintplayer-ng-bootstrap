import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';

@Component({
  selector: 'demo-user-agent',
  templateUrl: './user-agent.component.html',
  styleUrls: ['./user-agent.component.scss']
})
export class UserAgentComponent {
  
  colors = Color;
  detectedUserAgent?: BsUserAgent;

  userAgentDetected(userAgent?: BsUserAgent) {
    this.detectedUserAgent = userAgent;
  }
}
