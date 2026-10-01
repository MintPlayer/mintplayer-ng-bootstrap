import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MpRadio } from '@mintplayer/web-components/radio';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsRadioGroupDirective } from './radio-group.directive';
import { BsRadioComponent } from '../../component/radio.component';

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

@Component({
  template: `
    <div bsRadioGroup name="size" [formControl]="ctrl">
      <bs-radio value="s">Small</bs-radio>
      <bs-radio value="m">Medium</bs-radio>
      <bs-radio value="l">Large</bs-radio>
    </div>`,
  imports: [ReactiveFormsModule, BsRadioGroupDirective, BsRadioComponent],
})
class PlainHostComponent {
  readonly ctrl = new FormControl<string | null>('m');
}

describe('BsRadioGroupDirective on a plain host', () => {
  let fixture: ComponentFixture<PlainHostComponent>;
  const radios = () => [...fixture.nativeElement.querySelectorAll('mp-radio')] as MpRadio[];
  const pick = (index: number) => {
    const wc = radios()[index];
    wc.checked = true;
    wc.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: true } }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();
  });

  it('checks the radio matching the form value and names every radio after the group', () => {
    expect(radios().map((r) => r.checked)).toEqual([false, true, false]);
    expect(radios().every((r) => r.name === 'size')).toBe(true);
    fixture.componentInstance.ctrl.setValue('l');
    fixture.detectChanges();
    expect(radios().map((r) => r.checked)).toEqual([false, false, true]);
  });

  it('coordinates one-of-N itself: picking a radio unchecks the others and reports its value', () => {
    pick(0);
    expect(fixture.componentInstance.ctrl.value).toBe('s');
    expect(radios().map((r) => r.checked)).toEqual([true, false, false]);
  });

  it('a change that leaves nothing checked reports null', () => {
    const wc = radios()[1];
    wc.checked = false;
    wc.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: false } }));
    expect(fixture.componentInstance.ctrl.value).toBeNull();
  });

  it('disables and re-enables every radio with the control', () => {
    fixture.componentInstance.ctrl.disable();
    expect(radios().every((r) => r.disabled)).toBe(true);
    fixture.componentInstance.ctrl.enable();
    expect(radios().some((r) => r.disabled)).toBe(false);
  });

  it('ignores a group-change that bubbled from a nested group', () => {
    const inner = document.createElement('mp-radio-group');
    fixture.nativeElement.querySelector('div').appendChild(inner);
    inner.dispatchEvent(new CustomEvent('group-change', { bubbles: true, detail: { value: 's' } }));
    expect(fixture.componentInstance.ctrl.value).toBe('m');
  });
});
