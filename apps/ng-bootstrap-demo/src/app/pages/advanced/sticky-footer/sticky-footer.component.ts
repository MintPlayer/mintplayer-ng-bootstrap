import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsStickyFooterComponent, BsStickyFooterParentDirective } from '@mintplayer/ng-bootstrap/sticky-footer';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsStickyFooterComponent, BsStickyFooterParentDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyFooterComponent {
  numbers = [...Array(5).keys()];

  protected readonly snippetBasicHtml = dedent`
    <div bsStickyFooterParent>
      <main>
        Page content that may or may not fill the viewport.
      </main>

      <bs-sticky-footer>
        <bs-grid class="d-block py-3 bg-body-tertiary border-top">
          <div bsRow>
            <div [md]="4">A logo</div>
            <div [md]="4">Some links</div>
            <div [md]="4">&copy; Copyright</div>
          </div>
        </bs-grid>
      </bs-sticky-footer>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsStickyFooterComponent, BsStickyFooterParentDirective } from '@mintplayer/ng-bootstrap/sticky-footer';
    import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
    @Component({
      selector: 'my-sticky-footer-demo',
      templateUrl: './my-sticky-footer-demo.component.html',
      imports: [
        BsStickyFooterComponent,
        BsStickyFooterParentDirective,
        BsGridComponent,
        BsGridRowDirective,
        BsGridColumnDirective,
      ],
    })
    export class MyStickyFooterDemoComponent {}
  `;
}
