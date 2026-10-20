import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsRadioComponent } from './radio.component';

@Component({
  template: `
    <bs-radio aria-describedby="hint" [(isToggled)]="on" value="x">Alone</bs-radio>
    <bs-radio type="toggle_button" color="outline-primary" value="y">Button</bs-radio>`,
  imports: [BsRadioComponent],
})
class HostComponent {
  readonly on = signal(false);
}

describe('BsRadioComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const inputs = () => [...fixture.nativeElement.querySelectorAll('input')] as HTMLInputElement[];

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders a native radio in .form-check, named by its wrapping label', () => {
    const input = inputs()[0];
    expect(input.type).toBe('radio');
    expect(input.className).toBe('form-check-input');
    expect(input.closest('label')?.className).toBe('form-check');
    expect(input.getAttribute('value')).toBe('x');
    expect(input.hasAttribute('name')).toBe(false);
  });

  it('moves host aria-describedby onto the input', () => {
    expect(inputs()[0].getAttribute('aria-describedby')).toBe('hint');
  });

  it('reports a click through isToggled', () => {
    inputs()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
  });

  it('renders a toggle button as .btn-check plus a label for the input', () => {
    const input = inputs()[1];
    const label = input.nextElementSibling as HTMLLabelElement;
    expect(input.className).toBe('btn-check');
    expect(label.className).toBe('btn btn-outline-primary');
    expect(label.htmlFor).toBe(input.id);
  });
});
