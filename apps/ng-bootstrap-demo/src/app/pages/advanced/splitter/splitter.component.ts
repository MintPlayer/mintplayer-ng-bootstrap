import { Component, CUSTOM_ELEMENTS_SCHEMA, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import '@mintplayer/web-components/splitter';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  imports: [FormsModule, BsCheckboxComponent, BsCodeSnippetComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  bgWarning = model(false);

  protected readonly snippetBasicHtml = dedent`
    <mp-splitter orientation="horizontal">
      <div>Panel 1</div>
      <mp-splitter orientation="vertical">
        <div>Panel 2a</div>
        <div>Panel 2b</div>
      </mp-splitter>
    </mp-splitter>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
    import '@mintplayer/web-components/splitter';

    @Component({
      selector: 'my-splitter-demo',
      templateUrl: './my-splitter-demo.component.html',
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    export class MySplitterDemoComponent {}
  `;
}
