import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsDatepickerComponent } from './datepicker.component';
describe('BsDatepickerComponent — smoke', () => {
  let component: BsDatepickerComponent;
  let fixture: ComponentFixture<BsDatepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsDatepickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDatepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an mp-datepicker inside its template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mp-datepicker')).not.toBeNull();
  });

  it('forwards selectedDate into the WC', () => {
    const target = new Date(2026, 4, 20);
    component.selectedDate.set(target);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datepicker') as HTMLElement & { selectedDate: Date };
    expect(wc.selectedDate.getDate()).toBe(20);
  });
});

@Component({
  selector: 'host-cmp',
  template: `<bs-datepicker [formControl]="ctl" [min]="floor" [max]="ceiling" [disableDateFn]="disable"></bs-datepicker>`,
  imports: [BsDatepickerComponent, ReactiveFormsModule],
})
class HostCmp {
  ctl = new FormControl<Date | null>(null);
  floor: Date | undefined = undefined;
  ceiling: Date | undefined = undefined;
  disable: ((d: Date) => boolean) | undefined = undefined;
}

describe('BsDatepickerComponent — ControlValueAccessor + Validator', () => {
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
    host.ctl.setValue(new Date(2026, 4, 14));
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datepicker') as HTMLElement & { selectedDate: Date };
    expect(wc.selectedDate.getFullYear()).toBe(2026);
    expect(wc.selectedDate.getDate()).toBe(14);
  });

  it('dispatching selected-date-change updates FormControl.value', () => {
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datepicker')!;
    const target = new Date(2026, 4, 20);
    wc.dispatchEvent(new CustomEvent('selected-date-change', { detail: target, bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(host.ctl.value).toBeInstanceOf(Date);
    expect((host.ctl.value as Date).getDate()).toBe(20);
    expect(host.ctl.dirty).toBe(true);
  });

  it('setDisabledState propagates form-disabled to the WC', () => {
    host.ctl.disable();
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datepicker') as HTMLElement & { disabled: boolean };
    expect(wc.disabled).toBe(true);
  });

  it('min/max produce min/max errors on out-of-range values', () => {
    host.floor = new Date(2026, 0, 1);
    host.ceiling = new Date(2026, 11, 31);
    host.ctl.setValue(new Date(2025, 11, 31));
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['min']).toBeDefined();

    host.ctl.setValue(new Date(2027, 0, 1));
    fixture.detectChanges();
    expect(host.ctl.errors!['max']).toBeDefined();
  });

  it('disableDateFn produces disabledDate error', () => {
    host.disable = (d) => d.getDate() === 13;
    host.ctl.setValue(new Date(2026, 4, 13));
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['disabledDate']).toBe(true);
  });

  it('valid values produce no errors', () => {
    host.floor = new Date(2026, 0, 1);
    host.ceiling = new Date(2026, 11, 31);
    host.ctl.setValue(new Date(2026, 4, 14));
    fixture.detectChanges();
    expect(host.ctl.errors).toBeNull();
  });
});
