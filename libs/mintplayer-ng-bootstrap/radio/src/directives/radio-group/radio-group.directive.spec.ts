import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsRadioGroupDirective } from './radio-group.directive';

@Component({
  template: `<mp-radio-group bsRadioGroup name="fruit" [formControl]="ctrl"></mp-radio-group>`,
  imports: [ReactiveFormsModule, BsRadioGroupDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
class WcHostComponent {
  readonly ctrl = new FormControl<string | null>(null);
}

describe('BsRadioGroupDirective on an <mp-radio-group> host', () => {
  let component: WcHostComponent;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WcHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(WcHostComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    host = fixture.nativeElement.querySelector('mp-radio-group');
  });

  it('bridges group-change into the form — the only signal a keyboard selection produces', () => {
    host.dispatchEvent(
      new CustomEvent('group-change', {
        detail: { value: 'banana' },
        bubbles: true,
        composed: true,
      }),
    );
    expect(component.ctrl.value).toBe('banana');
  });

  it('ignores the bubbled change the WC host already handles (no double emit)', () => {
    const child = document.createElement('span');
    host.appendChild(child);
    child.dispatchEvent(new Event('change', { bubbles: true }));
    expect(component.ctrl.dirty).toBe(false);
    expect(component.ctrl.value).toBeNull();
  });

  it('marks the control touched on composed focusout', () => {
    expect(component.ctrl.touched).toBe(false);
    host.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(component.ctrl.touched).toBe(true);
  });
});
