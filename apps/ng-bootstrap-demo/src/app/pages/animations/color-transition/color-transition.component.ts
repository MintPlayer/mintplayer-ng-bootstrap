import { Component, computed, model, ChangeDetectionStrategy} from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  imports: [FormsModule, BsCheckboxComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorTransitionComponent {

  state = model(false);
  currentColor = computed(() => this.state() ? 'color1' : 'color2');

  protected readonly snippetBasicHtml = dedent`
    <bs-checkbox [type]="'checkbox'" [(ngModel)]="state">Toggle</bs-checkbox>

    <div [@colorTransition]="{ value: currentColor(), params: { color1: '#F00', color2: '#00F' }}"
         class="swatch d-inline-block"></div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, computed, model } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
    import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'my-color-transition-demo',
      templateUrl: './my-color-transition-demo.component.html',
      animations: [ColorTransitionAnimation],
      imports: [FormsModule, BsCheckboxComponent],
    })
    export class MyColorTransitionDemoComponent {
      state = model(false);
      currentColor = computed(() => this.state() ? 'color1' : 'color2');
    }
  `;
}
