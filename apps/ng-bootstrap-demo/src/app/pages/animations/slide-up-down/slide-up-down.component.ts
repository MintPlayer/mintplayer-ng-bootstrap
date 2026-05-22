import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { SlideUpDownAnimation, SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-slide-up-down',
  templateUrl: './slide-up-down.component.html',
  styleUrls: ['./slide-up-down.component.scss'],
  animations: [SlideUpDownAnimation, SlideUpDownNgifAnimation],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsButtonTypeDirective, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlideUpDownComponent {
  colors = Color;
  numbers = [...Array.from(Array(7)).keys()];

  slideUpDownState = signal(false);
  slideUpDownNgifState = signal(false);

  protected readonly snippetBasicHtml = dedent`
    <button (click)="state.set(!state())" [color]="colors.primary">Toggle</button>

    <div [@slideUpDown]="state()" class="overflow-hidden">
      <p>This block slides down on true and up on false.</p>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

    @Component({
      selector: 'my-slide-up-down-demo',
      templateUrl: './my-slide-up-down-demo.component.html',
      animations: [SlideUpDownAnimation],
      imports: [BsButtonTypeDirective],
    })
    export class MySlideUpDownDemoComponent {
      protected readonly colors = Color;
      protected state = signal(false);
    }
  `;
}
