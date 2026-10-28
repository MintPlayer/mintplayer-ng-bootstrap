import { DemoFormStateComponent } from '../../../components/form-state/form-state.component';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Component, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, DemoFormStateComponent, BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<number>(3);
  protected readonly formsControl = new FormControl<number>(3, { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-rating [(ngModel)]="value"></bs-rating>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-rating [formControl]="control"></bs-rating>
  `;

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
