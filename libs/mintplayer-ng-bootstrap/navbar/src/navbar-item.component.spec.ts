import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown';
import { coreContextToken } from '@mintplayer/ng-bootstrap/machine';
import { DROPDOWN_NESTING, NAVIGATION_NESTING } from '@mintplayer/ui-core/dropdown';
import { BsNavbarItemComponent } from './generated';

@Component({
  imports: [BsNavbarItemComponent],
  template: `<bs-navbar-item [active]="active()" [disabled]="disabled()"><a href="#home">Home</a></bs-navbar-item>`,
})
class HostComponent {
  readonly active = signal(false);
  readonly disabled = signal(false);
}

/** Inside a navbar dropdown the entries are bs-dropdown-items (#458 §4.5). */
@Component({
  imports: [BsDropdownItemComponent],
  template: `<bs-dropdown-item [active]="active()" [disabled]="disabled()"><a href="#home">Home</a></bs-dropdown-item>`,
})
class ItemHostComponent {
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

describe('BsDropdownItemComponent in a navbar dropdown', () => {
  let fixture: ComponentFixture<ItemHostComponent>;
  const host = () => fixture.nativeElement.querySelector('bs-dropdown-item') as HTMLElement;
  const set = (active: boolean, disabled: boolean) => {
    fixture.componentInstance.active.set(active);
    fixture.componentInstance.disabled.set(disabled);
    fixture.detectChanges();
  };

  beforeEach(() => {
    // What a bs-dropdown-menu inside a bs-navbar-nav provides its items.
    TestBed.configureTestingModule({
      providers: [{ provide: coreContextToken(DROPDOWN_NESTING), useValue: signal({ ...NAVIGATION_NESTING, depth: 0 }) }],
    });
    fixture = TestBed.createComponent(ItemHostComponent);
    fixture.detectChanges();
  });

  it('is a dropdown item around its link', () => {
    expect(host().classList).toContain('dropdown-item');
    expect(host().querySelector(':scope > a')?.textContent).toBe('Home');
  });

  it('states active and disabled on itself, since no menu role exists in a navbar', () => {
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
