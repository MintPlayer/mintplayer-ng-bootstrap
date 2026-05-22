import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BsNavbarTriggerDirective } from './navbar-trigger.directive';
@Component({
  selector: 'navbar-trigger-test',
  imports: [BsNavbarTriggerDirective],
  template: `<a [bsNavbarTrigger]="target()" #trigger>Trigger</a>`,
})
class NavbarTriggerTestComponent {
  readonly target = signal<string | readonly string[]>('/overlays');
}

@Component({ selector: 'page-overlays', template: `<div>overlays</div>` })
class OverlaysPageComponent {}

@Component({ selector: 'page-overlays-modals', template: `<div>modals</div>` })
class OverlaysModalsPageComponent {}

@Component({ selector: 'page-other', template: `<div>other</div>` })
class OtherPageComponent {}

async function configureTestBed(): Promise<void> {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'overlays', component: OverlaysPageComponent },
        { path: 'overlays/modals', component: OverlaysModalsPageComponent },
        { path: 'other', component: OtherPageComponent },
      ]),
    ],
    imports: [NavbarTriggerTestComponent],
  }).compileComponents();
}

function createFixture(): ComponentFixture<NavbarTriggerTestComponent> {
  const fixture = TestBed.createComponent(NavbarTriggerTestComponent);
  fixture.detectChanges();
  return fixture;
}

function getAnchor(fixture: ComponentFixture<NavbarTriggerTestComponent>): HTMLAnchorElement {
  return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
}

function getDirective(fixture: ComponentFixture<NavbarTriggerTestComponent>): BsNavbarTriggerDirective {
  const anchor = getAnchor(fixture);
  const debug = fixture.debugElement.query(el => el.nativeElement === anchor);
  return debug.injector.get(BsNavbarTriggerDirective);
}

describe('BsNavbarTriggerDirective', () => {
  beforeEach(async () => {
    await configureTestBed();
  });

  it('renders href="javascript:void(0)" on the host anchor', () => {
    const fixture = createFixture();
    const anchor = getAnchor(fixture);
    expect(anchor.getAttribute('href')).toBe('javascript:void(0)');
  });

  it('isActive() is false when current URL does not match', () => {
    const fixture = createFixture();
    const directive = getDirective(fixture);
    // No navigation has happened; router.url is "/" by default
    expect(directive.isActive()).toBe(false);
    expect(getAnchor(fixture).classList.contains('active')).toBe(false);
  });

  it('isActive() is true when current URL equals target', async () => {
    const fixture = createFixture();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/overlays');
    fixture.detectChanges();
    const directive = getDirective(fixture);
    expect(directive.isActive()).toBe(true);
    expect(getAnchor(fixture).classList.contains('active')).toBe(true);
  });

  it('isActive() is true when current URL starts with target + "/"', async () => {
    const fixture = createFixture();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/overlays/modals');
    fixture.detectChanges();
    const directive = getDirective(fixture);
    expect(directive.isActive()).toBe(true);
    expect(getAnchor(fixture).classList.contains('active')).toBe(true);
  });

  it('isActive() is false when current URL is a sibling that only shares a prefix substring', async () => {
    const fixture = createFixture();
    fixture.componentInstance.target.set('/over');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/overlays');
    fixture.detectChanges();

    // /overlays does NOT start with "/over/" and is not equal to "/over"
    const directive = getDirective(fixture);
    expect(directive.isActive()).toBe(false);
  });

  it('updates active state on NavigationEnd', async () => {
    const fixture = createFixture();
    const router = TestBed.inject(Router);
    const directive = getDirective(fixture);

    await router.navigateByUrl('/overlays');
    fixture.detectChanges();
    expect(directive.isActive()).toBe(true);

    await router.navigateByUrl('/other');
    fixture.detectChanges();
    expect(directive.isActive()).toBe(false);
    expect(getAnchor(fixture).classList.contains('active')).toBe(false);
  });

  it('accepts a string[] segments input and joins them with "/"', async () => {
    const fixture = createFixture();
    fixture.componentInstance.target.set(['/overlays', 'modals']);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/overlays/modals');
    fixture.detectChanges();

    const directive = getDirective(fixture);
    expect(directive.isActive()).toBe(true);
  });

  it('preventsDefault on click', () => {
    const fixture = createFixture();
    const anchor = getAnchor(fixture);
    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
