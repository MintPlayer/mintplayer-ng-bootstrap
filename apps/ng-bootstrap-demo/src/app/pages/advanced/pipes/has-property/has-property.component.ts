import { JsonPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsHasPropertyPipe } from '@mintplayer/ng-bootstrap/has-property';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-has-property',
  templateUrl: './has-property.component.html',
  styleUrls: ['./has-property.component.scss'],
  standalone: true,
  imports: [JsonPipe, FormsModule, BsHasPropertyPipe, BsCodeSnippetComponent, BsToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HasPropertyComponent {
  person = {
    firstName: 'John',
    lastName: 'Doe'
  };
}
