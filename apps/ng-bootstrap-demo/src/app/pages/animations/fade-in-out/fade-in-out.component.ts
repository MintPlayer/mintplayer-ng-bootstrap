import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-fade-in-out',
  templateUrl: './fade-in-out.component.html',
  styleUrls: ['./fade-in-out.component.scss'],
  animations: [FadeInOutAnimation],
  imports: [FormsModule, BsButtonTypeDirective, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FadeInOutComponent {
  colors = Color;
  fadeInOutState = signal(false);

  protected readonly snippetBasicHtml = dedent`
    <button (click)="fadeInOutState.set(!fadeInOutState())" [color]="colors.primary">
      Toggle
    </button>

    @if (fadeInOutState()) {
      <div [@fadeInOut] class="overflow-hidden">
        <p>Content that fades in and out as the signal toggles.</p>
      </div>
    }
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { FadeInOutAnimation } from '@mintplayer/ng-animations';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    @Component({
      selector: 'my-fade-in-out-demo',
      templateUrl: './my-fade-in-out-demo.component.html',
      animations: [FadeInOutAnimation],
      imports: [BsButtonTypeDirective],
    })
    export class MyFadeInOutDemoComponent {
      protected readonly colors = Color;
      protected fadeInOutState = signal(false);
    }
  `;
}
