import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BS_DROPDOWN_MENU_CONTEXT } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsNavbarItemComponent } from './navbar-item.component';

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

    it('wraps its link in an mp-navbar-item', () => {
      expect(host().querySelector('mp-navbar-item > a')?.textContent).toBe('Home');
    });

    it('bridges active and disabled to presence attributes, and marks the current page', () => {
      const item = host().querySelector('mp-navbar-item') as HTMLElement;
      expect(item.hasAttribute('active')).toBe(false);
      expect(item.hasAttribute('aria-current')).toBe(false);
      set(true, true);
      expect(item.getAttribute('active')).toBe('');
      expect(item.getAttribute('disabled')).toBe('');
      expect(item.getAttribute('aria-current')).toBe('page');
      expect(host().classList).not.toContain('dropdown-item');
    });
  });

  describe('in a dropdown menu', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [{ provide: BS_DROPDOWN_MENU_CONTEXT, useValue: true }] });
      fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
    });

    it('renders its link bare, as a dropdown item', () => {
      expect(host().querySelector('mp-navbar-item')).toBeNull();
      expect(host().querySelector('a')?.textContent).toBe('Home');
      expect(host().classList).toContain('dropdown-item');
    });

    it('uses Bootstrap item classes and ARIA on itself for active and disabled', () => {
      set(true, true);
      expect(host().classList).toContain('active');
      expect(host().classList).toContain('disabled');
      expect(host().getAttribute('aria-disabled')).toBe('true');
      expect(host().getAttribute('aria-current')).toBe('page');
      set(false, false);
      expect(host().hasAttribute('aria-disabled')).toBe(false);
      expect(host().hasAttribute('aria-current')).toBe(false);
    });
  });
});
