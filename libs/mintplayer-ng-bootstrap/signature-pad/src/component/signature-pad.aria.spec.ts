import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSignaturePadComponent } from './signature-pad.component';

@Component({
  selector: 'bs-signature-pad-harness',
  imports: [BsSignaturePadComponent],
  template: `<bs-signature-pad></bs-signature-pad>`,
})
class HarnessComponent {}

@Component({
  selector: 'bs-signature-pad-labeled-harness',
  imports: [BsSignaturePadComponent],
  template: `<bs-signature-pad aria-label="Customer signature" inputLabel="ignored"></bs-signature-pad>`,
})
class LabeledHarnessComponent {}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await customElements.whenDefined('mp-signature-pad');
  const wc = fixture.nativeElement.querySelector('mp-signature-pad') as HTMLElement & {
    updateComplete: Promise<unknown>;
  };
  await wc.updateComplete;
  fixture.detectChanges();
}

describe('BsSignaturePadComponent ARIA', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent, LabeledHarnessComponent],
    }).compileComponents();
  });

  const shadowCanvas = (fixture: ComponentFixture<unknown>) =>
    (fixture.nativeElement.querySelector('mp-signature-pad') as HTMLElement)
      .shadowRoot!.querySelector('canvas')!;

  it('canvas inside the WC is role="img" with the default label', async () => {
    const fixture = TestBed.createComponent(HarnessComponent);
    await settle(fixture);
    const canvas = shadowCanvas(fixture);
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Signature pad');
  });

  it('a consumer aria-label on the bs- host reaches the canvas and beats inputLabel', async () => {
    const fixture = TestBed.createComponent(LabeledHarnessComponent);
    await settle(fixture);
    expect(shadowCanvas(fixture).getAttribute('aria-label')).toBe('Customer signature');
  });

  it('typed alternative and Undo/Clear are present in the shadow root', async () => {
    const fixture = TestBed.createComponent(HarnessComponent);
    await settle(fixture);
    const shadow = (fixture.nativeElement.querySelector('mp-signature-pad') as HTMLElement).shadowRoot!;
    expect(shadow.querySelector('input.form-control')).not.toBeNull();
    expect(shadow.querySelectorAll('button').length).toBe(2);
  });
});
