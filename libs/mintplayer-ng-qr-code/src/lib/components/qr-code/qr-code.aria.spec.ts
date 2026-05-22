import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrCodeComponent } from './qr-code.component';

@Component({
  selector: 'qr-code-harness',
  imports: [QrCodeComponent],
  template: `
    <qr-code [value]="value()" [ariaLabel]="label()"></qr-code>
  `,
})
class HarnessComponent {
  value = signal<string | undefined>('https://example.com');
  label = signal<string | undefined>(undefined);
}

describe('QrCodeComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  const canvas = () => fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas');

  it('canvas has role="img"', () => {
    expect(canvas()!.getAttribute('role')).toBe('img');
  });

  it('aria-label defaults to "QR code for <value>"', () => {
    expect(canvas()!.getAttribute('aria-label')).toBe('QR code for https://example.com');
  });

  it('explicit ariaLabel overrides the default', () => {
    fixture.componentInstance.label.set('Wi-Fi network credentials');
    fixture.detectChanges();
    expect(canvas()!.getAttribute('aria-label')).toBe('Wi-Fi network credentials');
  });

  it('renders nothing when value is empty (canvas only appears when there is content)', () => {
    fixture.componentInstance.value.set(undefined);
    fixture.detectChanges();
    expect(canvas()).toBeNull();
  });
});
