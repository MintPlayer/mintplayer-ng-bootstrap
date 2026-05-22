import { Component, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective, BsSelectComponent, BsCarouselComponent, BsCarouselImageDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  mode = model<'slide' | 'fade'>('slide');
  orientation = model<'horizontal' | 'vertical'>('horizontal');
  // Auto-advance interval in milliseconds. The carousel honours this only
  // while not paused and not under prefers-reduced-motion (PRD
  // aria-accessibility-audit §13.2).
  interval = model<number>(4000);
  paused = model<boolean>(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-carousel ariaLabel="Animal photos">
      <img *bsCarouselImage src="/assets/resized/deer.png">
      <img *bsCarouselImage src="/assets/resized/duck.png">
      <img *bsCarouselImage src="/assets/resized/lion.png">
    </bs-carousel>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';
    @Component({
      selector: 'my-carousel-demo',
      templateUrl: './my-carousel-demo.component.html',
      imports: [BsCarouselComponent, BsCarouselImageDirective],
    })
    export class MyCarouselDemoComponent {}
  `;
}
