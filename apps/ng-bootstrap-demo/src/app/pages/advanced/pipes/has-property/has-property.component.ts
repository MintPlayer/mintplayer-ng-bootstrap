import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsHasPropertyPipe } from '@mintplayer/ng-bootstrap/has-property';

@Component({
  selector: 'demo-has-property',
  templateUrl: './has-property.component.html',
  styleUrls: ['./has-property.component.scss'],
  standalone: true,
  imports: [JsonPipe, FormsModule, BsHasPropertyPipe, BsCodeSnippetComponent, BsCheckboxModule]
})
export class HasPropertyComponent {
  person = {
    firstName: 'John',
    lastName: 'Doe'
  };
}
