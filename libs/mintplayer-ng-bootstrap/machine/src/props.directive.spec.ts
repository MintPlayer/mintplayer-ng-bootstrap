import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MpPropsDirective, PropBag } from './props.directive';

@Component({
  selector: 'bs-props-host',
  imports: [MpPropsDirective],
  template: `<input [mpProps]="bag()" />`,
})
class HostComponent {
  readonly bag = signal<PropBag>({ role: 'combobox', 'aria-expanded': 'false', 'aria-activedescendant': 'opt-1' });
}

describe('MpPropsDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, host: fixture.componentInstance, input };
  }

  it('sets every attribute of the bag', () => {
    const { input } = setup();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-1');
  });

  it('removes a key that leaves the bag or becomes null/false, and updates changed ones', () => {
    const { fixture, host, input } = setup();
    host.bag.set({ role: 'combobox', 'aria-expanded': 'true', disabled: false });
    fixture.detectChanges();
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.hasAttribute('disabled')).toBe(false);
    host.bag.set({ role: 'combobox', disabled: true });
    fixture.detectChanges();
    expect(input.hasAttribute('aria-expanded')).toBe(false);
    expect(input.getAttribute('disabled')).toBe('');
  });

  it('refuses URL- and script-bearing attribute names', () => {
    const { fixture, host } = setup();
    host.bag.set({ href: 'javascript:alert(1)' });
    expect(() => fixture.detectChanges()).toThrow(/refuses to set "href"/);
  });
});
