import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsNavbarTogglerComponent } from './navbar-toggler.component';

@Component({
  selector: 'bs-navbar-toggler-harness',
  imports: [BsNavbarTogglerComponent],
  template: `
    <bs-navbar-toggler
      [(state)]="state"
      [ariaLabel]="label()"
      [controls]="controls()"
    ></bs-navbar-toggler>
  `,
})
class HarnessComponent {
  state = signal(false);
  label = signal('Toggle navigation');
  controls = signal<string | null>(null);
}

describe('BsNavbarTogglerComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const button = () => fixture.nativeElement.querySelector<HTMLButtonElement>('button.navbar-toggler')!;

  it('renders a real <button type="button"> with the navbar-toggler classes', () => {
    expect(button().tagName).toBe('BUTTON');
    expect(button().getAttribute('type')).toBe('button');
  });

  it('has aria-label, aria-expanded, and respects the controls input', () => {
    expect(button().getAttribute('aria-label')).toBe('Toggle navigation');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().hasAttribute('aria-controls')).toBe(false);

    host.controls.set('main-nav');
    fixture.detectChanges();
    expect(button().getAttribute('aria-controls')).toBe('main-nav');
  });

  it('aria-expanded mirrors state', () => {
    host.state.set(true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-expanded')).toBe('true');
  });

  it('keyboard activation (Enter / Space via native button) toggles state', () => {
    button().click(); // native button click is what Enter/Space dispatch
    fixture.detectChanges();
    expect(host.state()).toBe(true);

    button().click();
    fixture.detectChanges();
    expect(host.state()).toBe(false);
  });
});
