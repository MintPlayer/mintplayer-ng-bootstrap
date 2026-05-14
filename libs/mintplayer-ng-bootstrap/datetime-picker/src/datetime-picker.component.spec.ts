import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, it, expect, beforeEach } from 'vitest';

import { BsDatetimePickerComponent } from './datetime-picker.component';

describe('BsDatetimePickerComponent — smoke', () => {
  let component: BsDatetimePickerComponent;
  let fixture: ComponentFixture<BsDatetimePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsDatetimePickerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BsDatetimePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an mp-datetime-picker inside its template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mp-datetime-picker')).not.toBeNull();
  });

  it('forwards value into the WC', () => {
    const target = new Date(2026, 4, 20, 14, 30);
    component.value.set(target);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker') as HTMLElement & { value: Date };
    expect(wc.value.getDate()).toBe(20);
    expect(wc.value.getHours()).toBe(14);
  });
});

@Component({
  selector: 'host-cmp',
  template: `<bs-datetime-picker [formControl]="ctl" [min]="floor" [max]="ceiling" [disableDateFn]="disable"></bs-datetime-picker>`,
  imports: [BsDatetimePickerComponent, ReactiveFormsModule],
})
class HostCmp {
  ctl = new FormControl<Date | null>(null);
  floor: Date | undefined = undefined;
  ceiling: Date | undefined = undefined;
  disable: ((d: Date) => boolean) | undefined = undefined;
}

describe('BsDatetimePickerComponent — ControlValueAccessor + Validator', () => {
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
    const t = new Date(2026, 4, 14, 9, 30);
    host.ctl.setValue(t);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker') as HTMLElement & { value: Date };
    expect(wc.value.getDate()).toBe(14);
    expect(wc.value.getHours()).toBe(9);
  });

  it('writeValue(null) clears the WC value', () => {
    host.ctl.setValue(new Date(2026, 4, 14));
    fixture.detectChanges();
    host.ctl.setValue(null);
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker') as HTMLElement & { value: Date | null };
    expect(wc.value).toBeNull();
  });

  it('value-change updates FormControl.value', () => {
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker')!;
    const target = new Date(2026, 4, 14, 9, 30);
    wc.dispatchEvent(new CustomEvent('value-change', { detail: target, bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(host.ctl.value).toBeInstanceOf(Date);
    expect((host.ctl.value as Date).getHours()).toBe(9);
    expect(host.ctl.dirty).toBe(true);
  });

  it('value-change with null clears FormControl', () => {
    host.ctl.setValue(new Date(2026, 4, 14));
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker')!;
    wc.dispatchEvent(new CustomEvent('value-change', { detail: null, bubbles: true, composed: true }));
    fixture.detectChanges();
    expect(host.ctl.value).toBeNull();
  });

  it('setDisabledState propagates form-disabled to the WC', () => {
    host.ctl.disable();
    fixture.detectChanges();
    const wc = (fixture.nativeElement as HTMLElement).querySelector('mp-datetime-picker') as HTMLElement & { disabled: boolean };
    expect(wc.disabled).toBe(true);
  });

  it('min produces min error on out-of-range value', () => {
    host.floor = new Date(2026, 0, 1);
    host.ctl.setValue(new Date(2025, 11, 31, 12, 0));
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['min']).toBeDefined();
  });

  it('max produces max error on out-of-range value', () => {
    host.ceiling = new Date(2026, 11, 31);
    host.ctl.setValue(new Date(2027, 0, 1, 12, 0));
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['max']).toBeDefined();
  });

  it('disableDateFn produces disabledDate error', () => {
    host.disable = (d) => d.getDate() === 13;
    host.ctl.setValue(new Date(2026, 4, 13, 9, 0));
    fixture.detectChanges();
    expect(host.ctl.errors).not.toBeNull();
    expect(host.ctl.errors!['disabledDate']).toBe(true);
  });

  it('valid values produce no errors', () => {
    host.floor = new Date(2026, 0, 1);
    host.ceiling = new Date(2026, 11, 31);
    host.ctl.setValue(new Date(2026, 4, 14, 9, 30));
    fixture.detectChanges();
    expect(host.ctl.errors).toBeNull();
  });
});
