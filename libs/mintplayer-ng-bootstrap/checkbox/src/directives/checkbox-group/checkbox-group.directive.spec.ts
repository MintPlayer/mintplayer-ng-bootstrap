import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MpCheckbox } from '@mintplayer/web-components/checkbox';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsCheckboxGroupDirective } from './checkbox-group.directive';
import { BsCheckboxComponent } from '../../component/checkbox.component';

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

@Component({
  template: `
    <div bsCheckboxGroup name="toppings" [formControl]="ctrl">
      <bs-checkbox value="ham">Ham</bs-checkbox>
      <bs-checkbox value="cheese">Cheese</bs-checkbox>
      <bs-checkbox value="olives">Olives</bs-checkbox>
    </div>`,
  imports: [ReactiveFormsModule, BsCheckboxGroupDirective, BsCheckboxComponent],
})
class GroupFormHostComponent {
  readonly ctrl = new FormControl<string[] | null>(['cheese']);
}

describe('BsCheckboxGroupDirective as a form control', () => {
  let fixture: ComponentFixture<GroupFormHostComponent>;
  const boxes = () => [...fixture.nativeElement.querySelectorAll('mp-checkbox')] as MpCheckbox[];
  const toggle = (index: number, checked: boolean) => {
    const wc = boxes()[index];
    wc.checked = checked;
    wc.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked, indeterminate: false } }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupFormHostComponent);
    fixture.detectChanges();
  });

  it('checks the boxes whose value is in the form array, named as an array field', () => {
    expect(boxes().map((b) => b.checked)).toEqual([false, true, false]);
    expect(boxes().every((b) => b.name === 'toppings[]')).toBe(true);
  });

  it('a null form value clears every box', () => {
    fixture.componentInstance.ctrl.setValue(null);
    fixture.detectChanges();
    expect(boxes().some((b) => b.checked)).toBe(false);
  });

  it('reports the checked values in declaration order', () => {
    toggle(2, true);
    toggle(0, true);
    expect(fixture.componentInstance.ctrl.value).toEqual(['ham', 'cheese', 'olives']);
    toggle(1, false);
    expect(fixture.componentInstance.ctrl.value).toEqual(['ham', 'olives']);
  });

  it('disables every box with the control', () => {
    fixture.componentInstance.ctrl.disable();
    expect(boxes().every((b) => b.disabled)).toBe(true);
  });

  it('marks the control touched on focusout', () => {
    fixture.nativeElement.querySelector('div').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});
