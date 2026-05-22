import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  imports: [BsCodeSnippetComponent, BsCloseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseComponent {

  onClose() {
    alert('Close');
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-close (click)="onClose()"></bs-close>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
    @Component({
      selector: 'my-close-demo',
      templateUrl: './my-close-demo.component.html',
      imports: [BsCloseComponent],
    })
    export class MyCloseDemoComponent {
      onClose() {
        // dismiss the surrounding container
      }
    }
  `;
}
