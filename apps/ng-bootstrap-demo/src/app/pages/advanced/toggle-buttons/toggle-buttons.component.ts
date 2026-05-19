import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsPlaylistTogglerComponent } from '@mintplayer/ng-bootstrap/playlist-toggler';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-toggle-buttons',
  templateUrl: './toggle-buttons.component.html',
  styleUrls: ['./toggle-buttons.component.scss'],
  imports: [BsCodeSnippetComponent, BsNavbarTogglerComponent, BsPlaylistTogglerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleButtonsComponent {
  state = model(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-navbar-toggler [(state)]="state"
                       class="cursor-pointer d-inline-block">
    </bs-navbar-toggler>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';

    @Component({
      selector: 'my-toggle-buttons-demo',
      templateUrl: './my-toggle-buttons-demo.component.html',
      imports: [BsNavbarTogglerComponent],
    })
    export class MyToggleButtonsDemoComponent {
      protected readonly state = model(false);
    }
  `;

  protected readonly snippetPlaylistHtml = dedent`
    <bs-playlist-toggler [(state)]="state"
                         class="cursor-pointer d-inline-block">
    </bs-playlist-toggler>
  `;
}
