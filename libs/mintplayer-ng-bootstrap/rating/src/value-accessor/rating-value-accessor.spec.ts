import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BsRatingComponent } from '../component/rating.component';

@Component({
  imports: [BsRatingComponent, ReactiveFormsModule],
  template: `<bs-rating [formControl]="ctrl"></bs-rating>`,
})
class ReactiveHost {
  readonly ctrl = new FormControl<number>(2, { nonNullable: true });
}

@Component({
  imports: [BsRatingComponent, FormsModule],
  template: `<bs-rating [(ngModel)]="value"></bs-rating>`,
})
class TemplateHost {
  readonly value = signal(4);
}

async function create<T>(type: new () => T): Promise<ComponentFixture<T>> {
  const f = TestBed.createComponent(type);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const stars = (f: ComponentFixture<unknown>) => [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('bs-rating button')];
const checked = (f: ComponentFixture<unknown>) => stars(f).findIndex((b) => b.getAttribute('aria-checked') === 'true') + 1;

describe('BsRatingValueAccessor', () => {
  it('shows the form value and reports a pick', async () => {
    const f = await create(ReactiveHost);
    expect(checked(f)).toBe(2);
    stars(f)[4].click();
    f.detectChanges();
    expect(f.componentInstance.ctrl.value).toBe(5);
    expect(f.componentInstance.ctrl.dirty).toBe(true);
  });

  it('follows a later form write without marking the control dirty', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.setValue(4);
    f.detectChanges();
    expect(checked(f)).toBe(4);
    expect(f.componentInstance.ctrl.dirty).toBe(false);
  });

  it('disables every star with the control and ignores keys', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    expect(stars(f).every((b) => b.disabled)).toBe(true);
    (f.nativeElement as HTMLElement).querySelector('bs-rating')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    f.detectChanges();
    expect(f.componentInstance.ctrl.value).toBe(2);
  });

  it('marks the control touched when focus leaves', async () => {
    const f = await create(ReactiveHost);
    stars(f)[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });

  it('works with ngModel', async () => {
    const f = await create(TemplateHost);
    expect(checked(f)).toBe(4);
    stars(f)[0].click();
    f.detectChanges();
    expect(f.componentInstance.value()).toBe(1);
  });
});
