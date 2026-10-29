import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BsFormComponent } from './form.component';

@Component({
  imports: [BsFormComponent],
  template: `<bs-form [action]="action()" [method]="method()"><input name="q"></bs-form>`,
})
class HostComponent {
  readonly action = signal<string | undefined>(undefined);
  readonly method = signal<'GET' | 'POST' | undefined>(undefined);
}

describe('BsFormComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('bs-form > form') as HTMLFormElement;
    return { fixture, form };
  }

  it('renders one form around its content', () => {
    const { form } = setup();
    expect(form).toBeTruthy();
    expect(form.querySelector('input[name="q"]')).toBeTruthy();
  });

  // Regression: [method]="undefined" printed method="undefined" (and action="") in server HTML.
  it('omits action and method while they are unset', () => {
    const { form } = setup();
    expect(form.hasAttribute('action')).toBe(false);
    expect(form.hasAttribute('method')).toBe(false);
  });

  it('writes action and method once set', () => {
    const { fixture, form } = setup();
    fixture.componentInstance.action.set('/search');
    fixture.componentInstance.method.set('GET');
    fixture.detectChanges();
    expect(form.getAttribute('action')).toBe('/search');
    expect(form.getAttribute('method')).toBe('GET');
  });
});
