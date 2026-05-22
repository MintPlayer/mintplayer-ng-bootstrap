import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, it, expect, beforeEach } from 'vitest';

import { BsTimepickerComponent } from './timepicker.component';

describe('BsTimepickerComponent — smoke', () => {
  let component: BsTimepickerComponent;
  let fixture: ComponentFixture<BsTimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsTimepickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BsTimepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an mp-timepicker inside its template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mp-timepicker')).not.toBeNull();
  });

  it('forwards selectedTime into the WC', () => {
    const target = new Date();
    target.setHours(15, 30, 0, 0);
    component.selectedTime.set(target);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-timepicker') as HTMLElement & { selectedTime: Date };
    expect(wc.selectedTime.getHours()).toBe(15);
    expect(wc.selectedTime.getMinutes()).toBe(30);
  });
});

@Component({
  selector: 'host-cmp',
  template: `<bs-timepicker [formControl]="ctl" [min]="floor" [max]="ceiling" [step]="step"></bs-timepicker>`,
  imports: [BsTimepickerComponent, ReactiveFormsModule],
})
class HostCmp {
  ctl = new FormControl<Date | null>(null);
  floor: Date | undefined = undefined;
  ceiling: Date | undefined = undefined;
  step: 1 | 5 | 10 | 15 | 30 | 60 = 15;
}

describe('BsTimepickerComponent — ControlValueAccessor + Validator', () => {
  let fixture: ComponentFixture<HostCmp>;
  let host: HostCmp;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostCmp],
    }).compileComponents();
    fixture = TestBed.createComponent(HostCmp);
    host = fixture.componentInstance;
  });

  it('writeValue(date) pushes through to the WC', () => {
    const t = new Date(); t.setHours(9, 0, 0, 0);
    host.ctl.setValue(t);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-timepicker') as HTMLElement & { selectedTime: Date };
    expect(wc.selectedTime.getHours()).toBe(9);
  });

  it('dispatching selected-time-change updates FormControl.value', () => {
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-timepicker')!;
    const target = new Date(); target.setHours(14, 45, 0, 0);
    wc.dispatchEvent(new CustomEvent('selected-time-change', { detail: target, bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(host.ctl.value).toBeInstanceOf(Date);
    expect((host.ctl.value as Date).getHours()).toBe(14);
    expect(host.ctl.dirty).toBe(true);
  });

  it('setDisabledState propagates form-disabled to the WC', () => {
    host.ctl.disable();
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-timepicker') as HTMLElement & { disabled: boolean };
    expect(wc.disabled).toBe(true);
  });

  it('min/max produce min/max errors on out-of-range values', () => {
    const minD = new Date(); minD.setHours(9, 0, 0, 0);
    const maxD = new Date(); maxD.setHours(17, 0, 0, 0);
    host.floor = minD;
    host.ceiling = maxD;
    const tooEarly = new Date(); tooEarly.setHours(8, 0, 0, 0);
    host.ctl.setValue(tooEarly);
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['min']).toBeDefined();

    const tooLate = new Date(); tooLate.setHours(18, 0, 0, 0);
    host.ctl.setValue(tooLate);
    fixture.detectChanges();
    expect(host.ctl.errors!['max']).toBeDefined();
  });

  it('step forwards through to the WC', () => {
    host.step = 30;
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-timepicker') as HTMLElement & { step: number };
    expect(wc.step).toBe(30);
  });
});
