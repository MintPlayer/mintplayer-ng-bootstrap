import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrCodeDirective } from './qr-code.directive';

@Component({
  selector: 'qr-code-test-component',
  template: `
    <canvas *ngIf="value"
      [qrCode]="value"
      [qrCodeErrorCorrectionLevel]="errorCorrectionLevel"
      [qrCodeCenterImageSrc]="centerImageSrc"
      [qrCodeCenterImageWidth]="centerImageSize"
      [qrCodeCenterImageHeight]="centerImageSize"
      [qrCodeMargin]="margin"
      [width]="size"
      [height]="size"
      [darkColor]="darkColor"
      [lightColor]="lightColor">
    </canvas>`
})
class QrcodeTestComponent {
}

describe('QrCodeDirective', () => {
  let component: QrcodeTestComponent;
  let fixture: ComponentFixture<QrcodeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        QrCodeDirective,

        // Testbench
        QrcodeTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QrcodeTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
