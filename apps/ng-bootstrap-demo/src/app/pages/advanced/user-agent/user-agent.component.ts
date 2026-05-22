import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsUserAgentDirective, BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-user-agent',
  templateUrl: './user-agent.component.html',
  styleUrls: ['./user-agent.component.scss'],
  imports: [BsAlertComponent, BsCodeSnippetComponent, BsUserAgentDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAgentComponent {

  colors = Color;
  detectedUserAgent?: BsUserAgent;

  userAgentDetected(userAgent?: BsUserAgent) {
    this.detectedUserAgent = userAgent;
  }

  protected readonly snippetBasicHtml = dedent`
    <div bsUserAgent (detected)="userAgentDetected($event)">
      @if (detectedUserAgent?.os) {
        <p>Operating system: <b>{{ detectedUserAgent.os }}</b></p>
      }
      @if (detectedUserAgent?.webbrowser) {
        <p>Web browser: <b>{{ detectedUserAgent.webbrowser }}</b></p>
      }
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsUserAgentDirective, BsUserAgent } from '@mintplayer/ng-bootstrap/user-agent';
    @Component({
      selector: 'my-user-agent-demo',
      templateUrl: './my-user-agent-demo.component.html',
      imports: [BsUserAgentDirective],
    })
    export class MyUserAgentDemoComponent {
      protected detectedUserAgent?: BsUserAgent;

      userAgentDetected(userAgent?: BsUserAgent) {
        this.detectedUserAgent = userAgent;
      }
    }
  `;
}
