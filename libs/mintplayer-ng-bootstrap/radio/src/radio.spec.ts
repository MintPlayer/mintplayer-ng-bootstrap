import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal, type WritableSignal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BsRadioComponent, BsRadioGroupComponent } from './generated';
import { BsRadioGroupDirective } from './directives';

/**
 * The generated `bs-radio` / `bs-radio-group` and the Angular-only attribute form
 * `[bsRadioGroup]` (#458 M3). Hosts drive inputs through signals: a plain-field
 * write notifies nothing under signal-based change detection (CLAUDE.md).
 */

const inputs = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll<HTMLInputElement>(`${selector} input[type=radio]`)];

function pick(input: HTMLInputElement): void {
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

@Component({
  imports: [FormsModule, BsRadioComponent, BsRadioGroupComponent],
  template: `
    <bs-radio-group name="fruit" aria-label="Fruit" [(ngModel)]="fruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
    </bs-radio-group>`,
})
class GroupHost {
  readonly fruit = signal<string | null>('banana');
}

@Component({
  imports: [ReactiveFormsModule, BsRadioComponent, BsRadioGroupComponent],
  template: `
    <bs-radio-group aria-label="Fruit" [formControl]="fruit">
      <bs-radio value="apple">Apple</bs-radio>
      <bs-radio value="banana">Banana</bs-radio>
    </bs-radio-group>`,
})
class ReactiveHost {
  readonly fruit = new FormControl<string | null>(null);
}

/** The table pattern: a row selection on the tbody, and a radio list of its own in a cell. */
@Component({
  imports: [FormsModule, BsRadioComponent, BsRadioGroupComponent, BsRadioGroupDirective],
  template: `
    <table>
      <tbody bsRadioGroup name="row" [(ngModel)]="row">
        @for (r of rows; track r) {
          <tr>
            <td class="select"><bs-radio [value]="r" [inputLabel]="'Select ' + r" /></td>
            <td class="size">
              <bs-radio-group [attr.aria-label]="'Size of ' + r" [(value)]="sizes[r]">
                <bs-radio value="S">S</bs-radio>
                <bs-radio value="L">L</bs-radio>
              </bs-radio-group>
            </td>
          </tr>
        }
      </tbody>
    </table>`,
})
class TableHost {
  readonly rows = ['r1', 'r2'];
  readonly row = signal<string | null>(null);
  readonly sizes: Record<string, WritableSignal<string | null>> = { r1: signal<string | null>('S'), r2: signal<string | null>(null) };
}

describe('bs-radio / bs-radio-group (generated)', () => {
  describe('a group', () => {
    let fixture: ComponentFixture<GroupHost>;
    const root = () => fixture.nativeElement as HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [GroupHost] }).compileComponents();
      fixture = TestBed.createComponent(GroupHost);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('is a named radiogroup whose radios share its name in Bootstrap form-check markup', () => {
      const group = root().querySelector('bs-radio-group') as HTMLElement;
      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-label')).toBe('Fruit');
      const radio = root().querySelector('bs-radio') as HTMLElement;
      expect(radio.classList.contains('form-check')).toBe(true);
      expect(radio.getAttribute('data-mps')).toBe('radio');
      const [apple] = inputs(root(), 'bs-radio-group');
      expect(apple.classList.contains('form-check-input')).toBe(true);
      expect(radio.querySelector('label.form-check-label')?.getAttribute('for')).toBe(apple.id);
      expect(inputs(root(), 'bs-radio-group').map((i) => i.name)).toEqual(['fruit', 'fruit']);
    });

    it('checks the radio ngModel names', () => {
      expect(inputs(root(), 'bs-radio-group').map((i) => i.checked)).toEqual([false, true]);
    });

    it('writes a pick back to ngModel', () => {
      pick(inputs(root(), 'bs-radio-group')[0]);
      fixture.detectChanges();
      expect(fixture.componentInstance.fruit()).toBe('apple');
    });
  });

  describe('a reactive group', () => {
    it('follows the form control and disables with it', async () => {
      await TestBed.configureTestingModule({ imports: [ReactiveHost] }).compileComponents();
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      fixture.componentInstance.fruit.setValue('apple');
      fixture.detectChanges();
      expect(inputs(root, 'bs-radio-group').map((i) => i.checked)).toEqual([true, false]);

      pick(inputs(root, 'bs-radio-group')[1]);
      expect(fixture.componentInstance.fruit.value).toBe('banana');

      fixture.componentInstance.fruit.disable();
      fixture.detectChanges();
      expect(inputs(root, 'bs-radio-group').every((i) => i.disabled)).toBe(true);
    });
  });

  describe('nested groups (the table pattern)', () => {
    let fixture: ComponentFixture<TableHost>;
    const root = () => fixture.nativeElement as HTMLElement;
    const rowRadios = () => inputs(root(), 'td.select');
    const sizeRadios = (row: number) => inputs(root().querySelectorAll<HTMLElement>('td.size')[row], '');

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [TableHost] }).compileComponents();
      fixture = TestBed.createComponent(TableHost);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('gives each group its own name: the nearest group wins', () => {
      const tbody = root().querySelector('tbody') as HTMLElement;
      expect(tbody.hasAttribute('data-radio-group')).toBe(true);
      expect(tbody.hasAttribute('role')).toBe(false);
      expect(rowRadios().map((i) => i.name)).toEqual(['row', 'row']);
      const names = [0, 1].map((r) => sizeRadios(r)[0].name);
      expect(names[0]).not.toBe('row');
      expect(names[0]).not.toBe(names[1]);
      expect(sizeRadios(0).map((i) => i.checked)).toEqual([true, false]);
    });

    it('a pick in a cell group never changes the row selection', () => {
      pick(sizeRadios(1)[1]);
      fixture.detectChanges();
      expect(fixture.componentInstance.sizes['r2']()).toBe('L');
      expect(fixture.componentInstance.row()).toBeNull();
    });

    it('a row pick never changes a cell group', () => {
      pick(rowRadios()[1]);
      fixture.detectChanges();
      expect(fixture.componentInstance.row()).toBe('r2');
      expect(fixture.componentInstance.sizes['r1']()).toBe('S');
      expect(fixture.componentInstance.sizes['r2']()).toBeNull();
    });
  });
});
