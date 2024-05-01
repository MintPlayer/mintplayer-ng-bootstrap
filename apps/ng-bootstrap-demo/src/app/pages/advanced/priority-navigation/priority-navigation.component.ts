import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPrioNavModule } from '@mintplayer/ng-bootstrap/priority-navigation';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-priority-navigation',
  standalone: true,
  imports: [CommonModule, BsPrioNavModule, BsButtonTypeDirective],
  templateUrl: './priority-navigation.component.html',
  styleUrl: './priority-navigation.component.scss',
})
export class PriorityNavigationComponent {
   elements: string[] = ['Faith Hilling', 'Planking', 'Owling', 'Bradying', 'Tebowing', 'Poodle Fisting', 'Taylor Swifting', 'Cat Breading', 'Fonzying', 'Mustaching', 'Reporting'];
   colors = Color;
}
