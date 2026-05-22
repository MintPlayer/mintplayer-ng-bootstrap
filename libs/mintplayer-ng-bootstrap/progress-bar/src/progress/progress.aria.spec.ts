import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsProgressComponent } from './progress.component';
@Component({
  selector: 'bs-progress-harness',
  imports: [BsProgressComponent],
  template: `
    <bs-progress [isIndeterminate]="indeterminate()" [ariaLabel]="label()"></bs-progress>
  `,
})
class HarnessComponent {
  indeterminate = signal(true);
  label = signal('Loading');
}

describe('BsProgressComponent ARIA (indeterminate)', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const bar = () => fixture.nativeElement.querySelector<HTMLElement>('.progress-bar');

  it('renders role="progressbar" with aria-label, but no aria-valuenow', () => {
    const el = bar()!;
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('Loading');
    expect(el.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('aria-label is configurable', () => {
    fixture.componentInstance.label.set('Saving changes');
    fixture.detectChanges();
    expect(bar()!.getAttribute('aria-label')).toBe('Saving changes');
  });

  it('renders nothing inside the progress when not indeterminate', () => {
    fixture.componentInstance.indeterminate.set(false);
    fixture.detectChanges();
    expect(bar()).toBeNull();
  });
});
