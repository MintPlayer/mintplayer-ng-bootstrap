import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsMarqueeComponent } from '@mintplayer/ng-bootstrap/marquee';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-marquee',
  templateUrl: './marquee.component.html',
  styleUrls: ['./marquee.component.scss'],
  imports: [BsCodeSnippetComponent, BsMarqueeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-marquee>Hello world</bs-marquee>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsMarqueeComponent } from '@mintplayer/ng-bootstrap/marquee';

    @Component({
      selector: 'my-marquee-demo',
      templateUrl: './my-marquee-demo.component.html',
      imports: [BsMarqueeComponent],
    })
    export class MyMarqueeDemoComponent {}
  `;
}
