import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBlockquoteModule } from '@mintplayer/ng-bootstrap/blockquote';

@Component({
  selector: 'demo-blockquote',
  standalone: true,
  imports: [CommonModule, BsBlockquoteModule],
  templateUrl: './blockquote.component.html',
  styleUrl: './blockquote.component.scss',
})
export class BlockquoteComponent {}
