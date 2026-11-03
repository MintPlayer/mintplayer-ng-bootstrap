// The a11y helpers that need @angular/forms (#452). A separate entry so that
// importing `@mintplayer/ng-bootstrap/a11y` (id service, roving focus, overlay
// focus, …) never pulls @angular/forms into an app's bundle.
export * from './control-validity/control-validity.directive';
