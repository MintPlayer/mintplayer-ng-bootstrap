import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsDatetimePickerComponent } from '../generated';

/**
 * The accessor and validator of the generated `bs-datetime-picker` (#437): a
 * form value drives the display, a picked day or slot reaches the form, a form
 * write never echoes back, and min / max / disableDateFn validate.
 */

@Component({
  imports: [BsDatetimePickerComponent, ReactiveFormsModule],
  template: `<bs-datetime-picker [formControl]="ctrl" [min]="min()" [disableDateFn]="disable()" name="start"></bs-datetime-picker>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<Date | null>(new Date(2026, 4, 13, 9, 30));
  readonly min = signal<Date | null>(null);
  readonly disable = signal<((d: Date) => boolean) | null>(null);
}

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

async function create(): Promise<ComponentFixture<ReactiveHost>> {
  const f = TestBed.createComponent(ReactiveHost);
  await settle(f);
  return f;
}

const root = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const field = (f: ComponentFixture<unknown>) => root(f).querySelector('input.datetime-picker-input') as HTMLInputElement;
const hidden = (f: ComponentFixture<unknown>) => root(f).querySelector('input[type=hidden]') as HTMLInputElement;

describe('BsDatetimePickerValueAccessor with Angular forms', () => {
  it('shows the form value and stays pristine', async () => {
    const f = await create();
    expect(hidden(f).value).toBe('2026-05-13T09:30');
    expect(field(f).value).not.toBe('');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('reports a picked day and slot to the form', async () => {
    const f = await create();
    (root(f).querySelector('td[data-date="2026-05-20"]') as HTMLElement).click();
    await settle(f);
    (root(f).querySelector('[data-minutes="615"]') as HTMLElement).click();
    await settle(f);
    const value = f.componentInstance.ctrl.value;
    expect([value?.getDate(), value?.getHours(), value?.getMinutes()]).toEqual([20, 10, 15]);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('a form write, even null, reaches the field without marking the control dirty', async () => {
    const f = await create();
    f.componentInstance.ctrl.setValue(new Date(2027, 0, 2, 18, 0));
    await settle(f);
    expect(hidden(f).value).toBe('2027-01-02T18:00');
    f.componentInstance.ctrl.setValue(null);
    await settle(f);
    expect(field(f).value).toBe('');
    expect(hidden(f).value).toBe('');
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('validates against min and disableDateFn, re-validating when they change', async () => {
    const f = await create();
    expect(f.componentInstance.ctrl.errors).toBeNull();
    f.componentInstance.min.set(new Date(2026, 4, 13, 10, 0));
    await settle(f);
    expect(f.componentInstance.ctrl.errors?.['min']).toBeTruthy();
    f.componentInstance.min.set(null);
    f.componentInstance.disable.set((d) => d.getDate() === 13);
    await settle(f);
    expect(f.componentInstance.ctrl.errors).toEqual({ disabledDate: true });
  });

  it('disables the field and the triggers with the control', async () => {
    const f = await create();
    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(field(f).disabled).toBe(true);
    expect((root(f).querySelector('.datetime-picker-date') as HTMLButtonElement).disabled).toBe(true);
  });
});
