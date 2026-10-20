import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsRadioGroupDirective } from './radio-group.directive';
import { BsRadioComponent } from '../../component/radio.component';

@Component({
  template: `
    <bs-radio-group aria-label="Size" [required]="true" [formControl]="ctrl">
      <bs-radio value="s">Small</bs-radio>
      <bs-radio value="m">Medium</bs-radio>
      <bs-radio value="l">Large</bs-radio>
    </bs-radio-group>`,
  imports: [ReactiveFormsModule, BsRadioGroupDirective, BsRadioComponent],
})
class ElementHostComponent {
  readonly ctrl = new FormControl<string | null>('m');
}

describe('<bs-radio-group>', () => {
  let fixture: ComponentFixture<ElementHostComponent>;
  const group = () => fixture.nativeElement.querySelector('bs-radio-group') as HTMLElement;
  const inputs = () => [...fixture.nativeElement.querySelectorAll('input[type=radio]')] as HTMLInputElement[];
  const pick = (index: number) => {
    inputs()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ElementHostComponent);
    fixture.detectChanges();
  });

  it('is a radiogroup and marks the set required', () => {
    expect(group().getAttribute('role')).toBe('radiogroup');
    expect(group().getAttribute('aria-required')).toBe('true');
    expect(inputs().every((input) => input.required)).toBe(true);
  });

  it('gives every radio one generated name, so the browser groups them', () => {
    const names = new Set(inputs().map((input) => input.name));
    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^bs-radio-group-\d+-name$/);
  });

  it('checks the radio matching the form value, as the property and the SSR attribute', () => {
    expect(inputs().map((input) => input.checked)).toEqual([false, true, false]);
    expect(inputs().map((input) => input.hasAttribute('checked'))).toEqual([false, true, false]);
    fixture.componentInstance.ctrl.setValue('l');
    fixture.detectChanges();
    expect(inputs().map((input) => input.checked)).toEqual([false, false, true]);
  });

  it('reports the picked radio; native grouping unchecks the others', () => {
    pick(0);
    expect(fixture.componentInstance.ctrl.value).toBe('s');
    expect(inputs().map((input) => input.checked)).toEqual([true, false, false]);
  });

  it('disables and re-enables every radio with the control', () => {
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();
    expect(inputs().every((input) => input.disabled)).toBe(true);
    expect(group().getAttribute('aria-disabled')).toBe('true');
    fixture.componentInstance.ctrl.enable();
    fixture.detectChanges();
    expect(inputs().some((input) => input.disabled)).toBe(false);
  });

  it('marks the control touched on focusout', () => {
    expect(fixture.componentInstance.ctrl.touched).toBe(false);
    group().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
  });
});

@Component({
  template: `
    <table>
      <tbody bsRadioGroup name="row" #g="bsRadioGroup" [formControl]="ctrl">
        <tr><td><bs-radio [group]="g" value="a" [inputLabel]="'Select A'" /></td></tr>
        <tr><td><bs-radio [group]="g" value="b" [inputLabel]="'Select B'" /></td></tr>
      </tbody>
    </table>`,
  imports: [ReactiveFormsModule, BsRadioGroupDirective, BsRadioComponent],
})
class TableHostComponent {
  readonly ctrl = new FormControl<string | null>(null);
}

describe('[bsRadioGroup] on a table section', () => {
  let fixture: ComponentFixture<TableHostComponent>;
  const inputs = () => [...fixture.nativeElement.querySelectorAll('input[type=radio]')] as HTMLInputElement[];

  beforeEach(() => {
    fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
  });

  it('keeps the host role and uses the given name', () => {
    expect(fixture.nativeElement.querySelector('tbody').hasAttribute('role')).toBe(false);
    expect(inputs().map((input) => input.name)).toEqual(['row', 'row']);
  });

  it('names each label-less radio through inputLabel', () => {
    expect(inputs().map((input) => input.getAttribute('aria-label'))).toEqual(['Select A', 'Select B']);
  });

  it('reports the picked row', () => {
    inputs()[1].click();
    expect(fixture.componentInstance.ctrl.value).toBe('b');
  });
});
