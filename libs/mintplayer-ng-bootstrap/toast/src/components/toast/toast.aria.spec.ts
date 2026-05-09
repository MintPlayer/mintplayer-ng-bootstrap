import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastComponent, BsToastPoliteness } from './toast.component';

@Component({
  selector: 'bs-toast-aria-harness',
  imports: [BsToastComponent],
  template: `<bs-toast [politeness]="politeness()">hi</bs-toast>`,
})
class HarnessComponent {
  politeness = signal<BsToastPoliteness>('assertive');
}

describe('BsToastComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const toast = () => fixture.nativeElement.querySelector<HTMLElement>('.toast')!;

  it('default (assertive) toast has role="alert" + aria-live="assertive" + aria-atomic="true"', () => {
    expect(toast().getAttribute('role')).toBe('alert');
    expect(toast().getAttribute('aria-live')).toBe('assertive');
    expect(toast().getAttribute('aria-atomic')).toBe('true');
  });

  it('polite toast switches role to "status" and aria-live to "polite"', () => {
    host.politeness.set('polite');
    fixture.detectChanges();
    expect(toast().getAttribute('role')).toBe('status');
    expect(toast().getAttribute('aria-live')).toBe('polite');
  });
});
