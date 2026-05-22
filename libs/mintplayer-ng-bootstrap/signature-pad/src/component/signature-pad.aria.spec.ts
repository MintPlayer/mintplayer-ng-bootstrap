import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSignaturePadComponent } from './signature-pad.component';
@Component({
  selector: 'bs-signature-pad-harness',
  imports: [BsSignaturePadComponent],
  template: `<bs-signature-pad [ariaLabel]="label()"></bs-signature-pad>`,
})
class HarnessComponent {
  label = signal('Signature pad');
}

describe('BsSignaturePadComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const canvas = () => fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas')!;

  it('canvas has role="img" so screen readers identify it as a graphic', () => {
    expect(canvas().getAttribute('role')).toBe('img');
  });

  it('canvas has the default aria-label "Signature pad"', () => {
    expect(canvas().getAttribute('aria-label')).toBe('Signature pad');
  });

  it('aria-label is customizable per instance', () => {
    fixture.componentInstance.label.set('Customer signature');
    fixture.detectChanges();
    expect(canvas().getAttribute('aria-label')).toBe('Customer signature');
  });
});
