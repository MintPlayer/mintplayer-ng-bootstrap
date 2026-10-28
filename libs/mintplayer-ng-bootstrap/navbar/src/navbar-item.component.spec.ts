import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { coreContextToken } from '@mintplayer/ng-bootstrap/machine';
import { NAVBAR_NESTING } from '@mintplayer/ui-core/navbar';
import { BsNavbarItemComponent } from './generated';

@Component({
  imports: [BsNavbarItemComponent],
  template: `<bs-navbar-item [active]="active()" [disabled]="disabled()"><a href="#home">Home</a></bs-navbar-item>`,
})
class HostComponent {
  readonly active = signal(false);
  readonly disabled = signal(false);
}

describe('BsNavbarItemComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = () => fixture.nativeElement.querySelector('bs-navbar-item') as HTMLElement;
  const set = (active: boolean, disabled: boolean) => {
    fixture.componentInstance.active.set(active);
    fixture.componentInstance.disabled.set(disabled);
    fixture.detectChanges();
  };

  describe('in a navbar', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
    });

    it('is a scoped nav-item around its link', () => {
      expect(host().classList).toContain('nav-item');
      expect(host().classList).not.toContain('dropdown-item');
      expect(host().getAttribute('data-mps')).toBe('navbar');
      expect(host().querySelector(':scope > a')?.textContent).toBe('Home');
    });

    it('marks the current page and the disabled state', () => {
      expect(host().hasAttribute('aria-current')).toBe(false);
      set(true, true);
      expect(host().classList).toContain('active');
      expect(host().classList).toContain('disabled');
      expect(host().getAttribute('aria-current')).toBe('page');
      expect(host().getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('in a dropdown', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [{ provide: coreContextToken(NAVBAR_NESTING), useValue: signal({ depth: 0 }) }] });
      fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
    });

    it('is a dropdown item around its link', () => {
      expect(host().classList).toContain('dropdown-item');
      expect(host().classList).not.toContain('nav-item');
      expect(host().querySelector(':scope > a')?.textContent).toBe('Home');
    });

    it('uses Bootstrap item classes and ARIA on itself for active and disabled', () => {
      set(true, true);
      expect(host().classList).toContain('active');
      expect(host().classList).toContain('disabled');
      expect(host().getAttribute('aria-disabled')).toBe('true');
      expect(host().getAttribute('aria-current')).toBe('true');
      set(false, false);
      expect(host().hasAttribute('aria-disabled')).toBe(false);
      expect(host().hasAttribute('aria-current')).toBe(false);
    });
  });
});
