import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { QrCodeTestingModule } from '@mintplayer/ng-qr-code/testing';
import { QrCodeComponent } from './qr-code.component';

describe('QrCodeComponent', () => {
  let component: QrCodeComponent;
  let fixture: ComponentFixture<QrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        BsGridTestingModule,
        QrCodeTestingModule
      ],
      declarations: [
        // Unit to test
        QrCodeComponent,
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
