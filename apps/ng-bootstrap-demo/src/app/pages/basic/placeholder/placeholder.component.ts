import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardBodyComponent, BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderComponent, BsPlaceholderFieldDirective } from '@mintplayer/ng-bootstrap/placeholder';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  imports: [BsCodeSnippetComponent, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCardComponent, BsCardHeaderComponent, BsCardBodyComponent, BsPlaceholderComponent, BsPlaceholderFieldDirective, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-placeholder [isLoading]="isLoading">
      <h5 class="card-title">
        <span bsPlaceholderField class="d-block">Featured</span>
      </h5>
      <p class="card-text">
        <span bsPlaceholderField [xxs]="7" class="d-inline-block">
          {{ isLoading ? '&nbsp;' : 'Hello world' }}
        </span>
      </p>
    </bs-placeholder>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsPlaceholderComponent, BsPlaceholderFieldDirective } from '@mintplayer/ng-bootstrap/placeholder';
    @Component({
      selector: 'my-placeholder-demo',
      templateUrl: './my-placeholder-demo.component.html',
      imports: [BsPlaceholderComponent, BsPlaceholderFieldDirective],
    })
    export class MyPlaceholderDemoComponent {
      protected isLoading = true;
    }
  `;


  constructor() {
    setTimeout(() => this.isLoading = false, 3000);
  }

  isLoading = true;
  colors = Color;
  lines = [
    'Hello world',
    'This is me',
    'Life should be',
    'Ooh, ooh, yeah',
    'Fun for everyone',
  ];
}
