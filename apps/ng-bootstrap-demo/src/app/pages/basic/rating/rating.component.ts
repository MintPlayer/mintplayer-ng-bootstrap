import { Component, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingComponent {
  ratingValue = model(3);
  previewValue = signal(3);

  protected readonly snippetBasicHtml = dedent`
    <bs-rating [maximum]="5" [(value)]="ratingValue"></bs-rating>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';

    @Component({
      selector: 'my-rating-demo',
      templateUrl: './my-rating-demo.component.html',
      imports: [BsRatingComponent],
    })
    export class MyRatingDemoComponent {
      protected readonly ratingValue = model(3);
    }
  `;
}
