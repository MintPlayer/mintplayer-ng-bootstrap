import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsCheckboxGroupDirective } from './checkbox-group.directive';

@Component({
  template: `
    <div id="plain" bsCheckboxGroup label="Toppings" [formControl]="toppings"></div>
    <div id="roled" bsCheckboxGroup role="list" [formControl]="other"></div>
    <table>
      <tbody id="structural" bsCheckboxGroup [formControl]="rows"></tbody>
    </table>
  `,
  imports: [ReactiveFormsModule, BsCheckboxGroupDirective],
})
class HostComponent {
  readonly toppings = new FormControl<string[]>([]);
  readonly other = new FormControl<string[]>([]);
  readonly rows = new FormControl<string[]>([]);
}

describe('BsCheckboxGroupDirective group semantics', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it('claims role="group" and writes the label as aria-label on a generic host', () => {
    const plain = element.querySelector('#plain')!;
    expect(plain.getAttribute('role')).toBe('group');
    expect(plain.getAttribute('aria-label')).toBe('Toppings');
  });

  it('never overwrites a consumer-set role', () => {
    expect(element.querySelector('#roled')!.getAttribute('role')).toBe('list');
  });

  it('leaves structural hosts alone — a tbody keeps its native rowgroup semantics', () => {
    expect(element.querySelector('#structural')!.hasAttribute('role')).toBe(false);
  });
});
