import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-parallax',
  imports: [BsCodeSnippetComponent, BsParallaxComponent],
  templateUrl: './parallax.component.html',
  styleUrl: './parallax.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallaxComponent {
  images = [
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ];

  numbers = Array(8);

  protected readonly snippetBasicHtml = dedent`
    <bs-parallax [image]="'/assets/photo.png'" [height]="300"></bs-parallax>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';
    @Component({
      selector: 'my-parallax-demo',
      templateUrl: './my-parallax-demo.component.html',
      imports: [BsParallaxComponent],
    })
    export class MyParallaxDemoComponent {}
  `;
}
