import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { QrCodeComponent } from './qr-code.component';

type RgbaColor = `#${string}`;
type QRCodeErrorCorrectionLevel = 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';

@Component({
  selector: 'qr-code',
  template: `QR code`
})
class QrCodeMockComponent {
  @Input() value?: string;
  @Input() size?: number;
  @Input() darkColor?: RgbaColor;
  @Input() lightColor?: RgbaColor;
  @Input() errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  @Input() centerImageSrc?: string;
  @Input() centerImageSize?: string | number;
  @Input() margin?: number;
}

describe('QrCodeComponent', () => {
  let component: QrCodeComponent;
  let fixture: ComponentFixture<QrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        QrCodeComponent,
      
        // Mock dependencies
        QrCodeMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QrCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
