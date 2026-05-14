import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Component({
  selector: 'demo-not-found',
  imports: [RouterLink, BsButtonTypeDirective],
  template: `
    <div class="text-center py-5">
      <h1 class="display-4">404</h1>
      <p class="lead">The page you're looking for doesn't exist.</p>
      <a [routerLink]="['/']" [color]="colors.primary">Back to home</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  protected readonly colors = Color;
}
