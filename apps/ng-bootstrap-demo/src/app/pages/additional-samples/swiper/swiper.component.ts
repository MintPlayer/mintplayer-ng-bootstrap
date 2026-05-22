import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColDirective, BsAlertComponent, BsCarouselComponent, BsCarouselImageDirective, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwiperComponent {

  colors = Color;
  images = [
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ];

  protected readonly snippetBasicHtml = dedent`
    <bs-carousel [indicators]="true" [animation]="'slide'">
      @for (image of images; track image) {
        <img *bsCarouselImage [src]="image">
      }
    </bs-carousel>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsCarouselComponent,
      BsCarouselImageDirective,
    } from '@mintplayer/ng-bootstrap/carousel';

    @Component({
      selector: 'my-swiper-demo',
      templateUrl: './my-swiper-demo.component.html',
      imports: [BsCarouselComponent, BsCarouselImageDirective],
    })
    export class MySwiperDemoComponent {
      protected images = [
        '/assets/slide-1.png',
        '/assets/slide-2.png',
        '/assets/slide-3.png',
      ];
    }
  `;
}
