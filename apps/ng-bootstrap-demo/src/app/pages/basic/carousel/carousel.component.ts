import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective, BsSelectComponent, BsCarouselComponent],
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
    <bs-carousel [indicators]="true" [interval]="4000" ariaLabel="Animal photos">
      <img src="/assets/resized/deer.png" alt="A deer">
      <img src="/assets/resized/duck.png" alt="A duck">
      <img src="/assets/resized/lion.png" alt="A lion">
    </bs-carousel>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';

    @Component({
      selector: 'my-carousel-demo',
      templateUrl: './my-carousel-demo.component.html',
      imports: [BsCarouselComponent],
    })
    export class MyCarouselDemoComponent {}
  `;

  protected readonly snippetNestedHtml = dedent`
    <bs-carousel orientation="vertical" [indicators]="true" ariaLabel="Outer vertical">
      <img src="/assets/resized/deer.png" alt="A deer">
      <div>
        <bs-carousel animation="slide" [indicators]="true" ariaLabel="Inner horizontal">
          <img src="/assets/resized/duck.png" alt="A duck">
          <img src="/assets/resized/leopard.png" alt="A leopard">
        </bs-carousel>
      </div>
      <img src="/assets/resized/lion.png" alt="A lion">
    </bs-carousel>
  `;
}
