import { describe, expect, it } from 'vitest';
import { Component, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsNavbarComponent } from './navbar.component';

@Component({
  selector: 'host-test',
  imports: [BsNavbarComponent],
  template: `<bs-navbar [color]="color()"></bs-navbar>`,
})
class HostTestComponent {
  color: WritableSignal<Color | string | null> = signal<Color | string | null>(null);
}

function makeFixture(initial: Color | string | null): {
  fx: ComponentFixture<HostTestComponent>;
  nav: HTMLElement;
  host: HostTestComponent;
} {
  TestBed.configureTestingModule({ imports: [HostTestComponent] });
  const fx = TestBed.createComponent(HostTestComponent);
  fx.componentInstance.color.set(initial);
  fx.detectChanges();
  const nav = fx.debugElement.query(By.css('nav.navbar')).nativeElement as HTMLElement;
  return { fx, nav, host: fx.componentInstance };
}

// Mapping table per docs/issue_324_navbar_modernize_PRD.md FR-2.
const cases: Array<{
  color: Color | string | null;
  bgClass: string | null;
  dataBsTheme: 'light' | 'dark' | null;
}> = [
  { color: null,              bgClass: null,                  dataBsTheme: null },
  { color: Color.light,       bgClass: 'bg-light',            dataBsTheme: 'light' },
  { color: Color.white,       bgClass: 'bg-white',            dataBsTheme: 'light' },
  { color: Color.body,        bgClass: 'bg-body',             dataBsTheme: null },
  { color: Color.transparent, bgClass: 'bg-transparent',      dataBsTheme: null },
  { color: Color.dark,        bgClass: 'bg-dark',             dataBsTheme: 'dark' },
  { color: Color.primary,     bgClass: 'bg-primary',          dataBsTheme: 'dark' },
  { color: Color.secondary,   bgClass: 'bg-secondary',        dataBsTheme: 'dark' },
  { color: Color.success,     bgClass: 'bg-success',          dataBsTheme: 'dark' },
  { color: Color.danger,      bgClass: 'bg-danger',           dataBsTheme: 'dark' },
  { color: Color.warning,     bgClass: 'bg-warning',          dataBsTheme: 'dark' },
  { color: Color.info,        bgClass: 'bg-info',             dataBsTheme: 'dark' },
  // String values pass through as Bootstrap utility suffixes with no data-bs-theme override.
  { color: 'body-tertiary',   bgClass: 'bg-body-tertiary',    dataBsTheme: null },
  { color: 'body-secondary',  bgClass: 'bg-body-secondary',   dataBsTheme: null },
];

describe('BsNavbarComponent — [color] emission', () => {
  for (const c of cases) {
    const label =
      c.color === null
        ? 'null (default)'
        : typeof c.color === 'string'
          ? `'${c.color}'`
          : `Color.${Color[c.color]}`;
    it(`${label} → bg=${c.bgClass ?? '<none>'}, data-bs-theme=${c.dataBsTheme ?? '<omitted>'}`, () => {
      const { nav } = makeFixture(c.color);

      if (c.bgClass) {
        expect(nav.classList.contains(c.bgClass)).toBe(true);
      } else {
        // No bg-* class should be present.
        for (const cls of Array.from(nav.classList)) {
          expect(cls.startsWith('bg-')).toBe(false);
        }
      }

      const attr = nav.getAttribute('data-bs-theme');
      if (c.dataBsTheme === null) {
        expect(attr).toBeNull();
      } else {
        expect(attr).toBe(c.dataBsTheme);
      }
    });
  }

  it('never emits the deprecated .navbar-light / .navbar-dark classes for any color', () => {
    const { fx, nav, host } = makeFixture(null);
    for (const c of cases) {
      host.color.set(c.color);
      fx.detectChanges();
      expect(nav.classList.contains('navbar-light')).toBe(false);
      expect(nav.classList.contains('navbar-dark')).toBe(false);
    }
  });

  it('reacts when [color] changes at runtime', () => {
    const { nav, host, fx } = makeFixture(null);
    expect(nav.getAttribute('data-bs-theme')).toBeNull();

    host.color.set(Color.dark);
    fx.detectChanges();
    expect(nav.classList.contains('bg-dark')).toBe(true);
    expect(nav.getAttribute('data-bs-theme')).toBe('dark');

    host.color.set(Color.light);
    fx.detectChanges();
    expect(nav.classList.contains('bg-dark')).toBe(false);
    expect(nav.classList.contains('bg-light')).toBe(true);
    expect(nav.getAttribute('data-bs-theme')).toBe('light');

    host.color.set(null);
    fx.detectChanges();
    expect(nav.classList.contains('bg-light')).toBe(false);
    expect(nav.getAttribute('data-bs-theme')).toBeNull();
  });
});
