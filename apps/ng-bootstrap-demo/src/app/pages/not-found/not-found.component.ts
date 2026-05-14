import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'demo-not-found',
  imports: [RouterLink],
  template: `
    <div class="text-center py-5">
      <h1 class="display-4">404</h1>
      <p class="lead">The page you're looking for doesn't exist.</p>
      <a [routerLink]="['/']" class="text-decoration-none">Back to home</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
