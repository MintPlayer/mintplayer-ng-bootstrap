import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BsNavbarComponent } from './navbar.component';
@Component({
  selector: 'bs-navbar-aria-harness',
  imports: [BsNavbarComponent],
  template: `<bs-navbar><div data-testid="content">links</div></bs-navbar>`,
})
class HarnessComponent {}

describe('BsNavbarComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const button = () => fixture.nativeElement.querySelector<HTMLButtonElement>('button.navbar-toggler')!;
  const collapseDiv = () => fixture.nativeElement.querySelector<HTMLElement>('[data-testid="content"]')?.parentElement;

  it('toggle button aria-controls points at the actual collapse wrapper id', () => {
    const id = button().getAttribute('aria-controls');
    expect(id).toMatch(/^bs-navbar-collapse-\d+$/);
    expect(collapseDiv()!.id).toBe(id);
  });

  it('the <nav> landmark has the configured aria-label', () => {
    const nav = fixture.nativeElement.querySelector<HTMLElement>('nav.navbar')!;
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
  });
});
