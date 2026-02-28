import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { QrCodeComponent as LibQrCodeComponent } from '@mintplayer/ng-qr-code';
import { MockComponent, MockDirective } from 'ng-mocks';
import { QrCodeComponent } from './qr-code.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';

describe('QrCodeComponent', () => {
  let component: QrCodeComponent;
  let fixture: ComponentFixture<QrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(LibQrCodeComponent),
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
